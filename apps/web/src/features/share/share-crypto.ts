import type { EncryptedShareSnapshotV1 } from '@marginbase/api-client';
import type { SharedSnapshotV1 } from '@marginbase/domain-core';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array): string => {
  const base64 = typeof Buffer !== 'undefined'
    ? Buffer.from(bytes).toString('base64')
    : btoa(String.fromCharCode(...bytes));

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = `${base64}${padding}`;

  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(normalized, 'base64'));
  }

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const resolveCrypto = (): Crypto => {
  const cryptoRef = globalThis.crypto;

  if (!cryptoRef?.subtle) {
    throw new Error('WebCrypto is unavailable in the current environment.');
  }

  return cryptoRef;
};

const toWebCryptoBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

const importAesKey = async (shareKey: string): Promise<CryptoKey> => {
  const keyBytes = fromBase64Url(shareKey);

  if (keyBytes.byteLength !== 32) {
    throw new Error('Share link key is invalid.');
  }

  return resolveCrypto().subtle.importKey('raw', toWebCryptoBuffer(keyBytes), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

export const generateShareKey = (): string => {
  const bytes = new Uint8Array(32);
  resolveCrypto().getRandomValues(bytes);
  return toBase64Url(bytes);
};

export const encryptShareSnapshot = async (
  snapshot: SharedSnapshotV1,
  shareKey: string
): Promise<EncryptedShareSnapshotV1> => {
  const iv = new Uint8Array(12);
  resolveCrypto().getRandomValues(iv);

  const key = await importAesKey(shareKey);
  const plaintext = encoder.encode(JSON.stringify(snapshot));

  const ciphertextBuffer = await resolveCrypto().subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toWebCryptoBuffer(iv)
    },
    key,
    plaintext
  );

  return {
    schemaVersion: 1,
    algorithm: 'A256GCM',
    ivBase64Url: toBase64Url(iv),
    ciphertextBase64Url: toBase64Url(new Uint8Array(ciphertextBuffer))
  };
};

export const decryptShareSnapshot = async (
  encryptedSnapshot: EncryptedShareSnapshotV1,
  shareKey: string
): Promise<SharedSnapshotV1> => {
  if (encryptedSnapshot.schemaVersion !== 1 || encryptedSnapshot.algorithm !== 'A256GCM') {
    throw new Error('Unsupported encrypted snapshot payload.');
  }

  const key = await importAesKey(shareKey);
  const iv = fromBase64Url(encryptedSnapshot.ivBase64Url);
  const ciphertext = fromBase64Url(encryptedSnapshot.ciphertextBase64Url);

  const plaintextBuffer = await resolveCrypto().subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toWebCryptoBuffer(iv)
    },
    key,
    toWebCryptoBuffer(ciphertext)
  );

  return JSON.parse(decoder.decode(new Uint8Array(plaintextBuffer))) as SharedSnapshotV1;
};
