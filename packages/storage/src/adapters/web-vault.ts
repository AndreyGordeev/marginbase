import type { ModuleId } from '@marginbase/domain-core';
import type { PersistedScenario, ScenarioRepository } from '../contracts';

export interface WebVaultEncryptedEnvelopeV1 {
  version: 1;
  saltBase64: string;
  ivBase64: string;
  ciphertextBase64: string;
}

export interface WebVaultStoredScenario {
  schemaVersion: 1;
  scenarioId: string;
  module: ModuleId;
  scenarioName: '__vault_encrypted__';
  inputData: {
    vaultEnvelope: WebVaultEncryptedEnvelopeV1;
  };
  updatedAt: string;
}

export interface CreateWebVaultScenarioRepositoryInput {
  baseRepository: ScenarioRepository;
  passphrase: string;
  saltBase64?: string;
}

export class WebVaultAccessError extends Error {
  public constructor(message = 'Vault data is inaccessible. Check passphrase.') {
    super(message);
    this.name = 'WebVaultAccessError';
  }
}

const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const getWebCrypto = (): Crypto => {
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto;
  }

  throw new Error('WebCrypto is unavailable in current runtime.');
};

const toBase64 = (bytes: Uint8Array): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

const deriveKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  const webCrypto = getWebCrypto();

  const passphraseKey = await webCrypto.subtle.importKey('raw', textEncoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);

  return webCrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const encryptScenario = async (scenario: PersistedScenario, key: CryptoKey, salt: Uint8Array): Promise<WebVaultStoredScenario> => {
  const webCrypto = getWebCrypto();
  const iv = webCrypto.getRandomValues(new Uint8Array(IV_BYTES));

  const plaintext = textEncoder.encode(JSON.stringify(scenario));
  const encrypted = await webCrypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, plaintext);

  return {
    schemaVersion: 1,
    scenarioId: scenario.scenarioId,
    module: scenario.module,
    scenarioName: '__vault_encrypted__',
    inputData: {
      vaultEnvelope: {
        version: 1,
        saltBase64: toBase64(salt),
        ivBase64: toBase64(iv),
        ciphertextBase64: toBase64(new Uint8Array(encrypted))
      }
    },
    updatedAt: scenario.updatedAt
  };
};

const isVaultStoredScenario = (scenario: PersistedScenario): scenario is WebVaultStoredScenario => {
  return (
    scenario.scenarioName === '__vault_encrypted__' &&
    Boolean((scenario.inputData as { vaultEnvelope?: unknown } | undefined)?.vaultEnvelope)
  );
};

const decryptStoredScenario = async (scenario: PersistedScenario, key: CryptoKey): Promise<PersistedScenario> => {
  if (!isVaultStoredScenario(scenario)) {
    return scenario;
  }

  const envelope = scenario.inputData.vaultEnvelope;

  try {
    const iv = fromBase64(envelope.ivBase64);
    const ciphertext = fromBase64(envelope.ciphertextBase64);

    const decrypted = await getWebCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv)
      },
      key,
      toArrayBuffer(ciphertext)
    );

    return JSON.parse(textDecoder.decode(decrypted)) as PersistedScenario;
  } catch {
    throw new WebVaultAccessError();
  }
};

export class WebVaultScenarioRepository implements ScenarioRepository {
  private constructor(
    private readonly baseRepository: ScenarioRepository,
    private readonly key: CryptoKey,
    private readonly salt: Uint8Array,
    public readonly saltBase64: string
  ) {}

  public static async fromPassphrase(input: CreateWebVaultScenarioRepositoryInput): Promise<WebVaultScenarioRepository> {
    const webCrypto = getWebCrypto();
    const salt = input.saltBase64 ? fromBase64(input.saltBase64) : webCrypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const key = await deriveKey(input.passphrase, salt);

    return new WebVaultScenarioRepository(input.baseRepository, key, salt, toBase64(salt));
  }

  public async upsertScenario(scenario: PersistedScenario): Promise<void> {
    const encrypted = await encryptScenario(scenario, this.key, this.salt);
    await this.baseRepository.upsertScenario(encrypted as PersistedScenario);
  }

  public async getScenarioById(scenarioId: string): Promise<PersistedScenario | null> {
    const stored = await this.baseRepository.getScenarioById(scenarioId);
    if (!stored) {
      return null;
    }

    return decryptStoredScenario(stored, this.key);
  }

  public async listScenarios(module?: ModuleId): Promise<PersistedScenario[]> {
    const stored = await this.baseRepository.listScenarios(module);

    return Promise.all(stored.map((scenario) => decryptStoredScenario(scenario, this.key)));
  }

  public async deleteScenario(scenarioId: string): Promise<boolean> {
    return this.baseRepository.deleteScenario(scenarioId);
  }

  public async replaceAllScenarios(scenarios: PersistedScenario[]): Promise<void> {
    const encrypted = await Promise.all(scenarios.map((scenario) => encryptScenario(scenario, this.key, this.salt)));
    await this.baseRepository.replaceAllScenarios(encrypted as PersistedScenario[]);
  }

  public async clearScenarios(): Promise<void> {
    await this.baseRepository.clearScenarios();
  }
}