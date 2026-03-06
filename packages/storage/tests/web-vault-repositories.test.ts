import { describe, expect, it } from 'vitest';
import {
  SqlitePlaceholderConnection,
  SqlitePlaceholderScenarioRepository,
  WebVaultAccessError,
  WebVaultScenarioRepository,
} from '../src';

const sampleScenario = {
  schemaVersion: 1 as const,
  scenarioId: 'vault_scenario_1',
  module: 'profit' as const,
  scenarioName: 'Vault Scenario',
  inputData: { unitPriceMinor: 1100, quantity: 10 },
  calculatedData: { revenueTotalMinor: '11000' },
  updatedAt: '2026-03-02T10:00:00.000Z',
};

describe('web vault scenario repository', () => {
  it('encrypts data at repository boundary and decrypts with correct passphrase', async () => {
    const baseRepository = new SqlitePlaceholderScenarioRepository(
      new SqlitePlaceholderConnection(),
    );
    const vaultRepository = await WebVaultScenarioRepository.fromPassphrase({
      baseRepository,
      passphrase: 'correct horse battery staple',
    });

    await vaultRepository.upsertScenario(sampleScenario);

    const storedRaw = await baseRepository.getScenarioById(
      sampleScenario.scenarioId,
    );
    expect(storedRaw).not.toBeNull();
    expect(storedRaw?.scenarioName).toBe('__vault_encrypted__');
    expect(
      (storedRaw?.inputData as { unitPriceMinor?: number }).unitPriceMinor,
    ).toBeUndefined();

    const decrypted = await vaultRepository.getScenarioById(
      sampleScenario.scenarioId,
    );
    expect(decrypted?.scenarioName).toBe(sampleScenario.scenarioName);
    expect(
      (decrypted?.inputData as { unitPriceMinor?: number }).unitPriceMinor,
    ).toBe(1100);
  });

  it('fails to decrypt data with wrong passphrase', async () => {
    const baseRepository = new SqlitePlaceholderScenarioRepository(
      new SqlitePlaceholderConnection(),
    );

    const writer = await WebVaultScenarioRepository.fromPassphrase({
      baseRepository,
      passphrase: 'passphrase-a',
    });
    await writer.upsertScenario(sampleScenario);

    const readerWrongPassphrase =
      await WebVaultScenarioRepository.fromPassphrase({
        baseRepository,
        passphrase: 'passphrase-b',
        saltBase64: writer.saltBase64,
      });

    await expect(readerWrongPassphrase.listScenarios()).rejects.toBeInstanceOf(
      WebVaultAccessError,
    );
  });

  it('replace-all encrypts each scenario payload', async () => {
    const baseRepository = new SqlitePlaceholderScenarioRepository(
      new SqlitePlaceholderConnection(),
    );
    const vaultRepository = await WebVaultScenarioRepository.fromPassphrase({
      baseRepository,
      passphrase: 'vault-passphrase',
    });

    await vaultRepository.replaceAllScenarios([
      sampleScenario,
      {
        ...sampleScenario,
        scenarioId: 'vault_scenario_2',
        module: 'cashflow',
        scenarioName: 'Vault Scenario 2',
      },
    ]);

    const raw = await baseRepository.listScenarios();
    expect(raw.length).toBe(2);
    expect(
      raw.every((scenario) => scenario.scenarioName === '__vault_encrypted__'),
    ).toBe(true);

    const decrypted = await vaultRepository.listScenarios();
    expect(decrypted.length).toBe(2);
    expect(
      decrypted.some(
        (scenario) => scenario.scenarioName === 'Vault Scenario 2',
      ),
    ).toBe(true);
  });

  it('returns null for missing scenario and supports delete/clear pass-through', async () => {
    const baseRepository = new SqlitePlaceholderScenarioRepository(
      new SqlitePlaceholderConnection(),
    );
    const vaultRepository = await WebVaultScenarioRepository.fromPassphrase({
      baseRepository,
      passphrase: 'vault-passphrase',
    });

    expect(await vaultRepository.getScenarioById('missing')).toBeNull();
    expect(await vaultRepository.deleteScenario('missing')).toBe(false);

    await vaultRepository.upsertScenario(sampleScenario);
    await vaultRepository.clearScenarios();
    expect((await baseRepository.listScenarios()).length).toBe(0);
  });

  it('returns plaintext scenarios unchanged when they are not vault envelopes', async () => {
    const baseRepository = new SqlitePlaceholderScenarioRepository(
      new SqlitePlaceholderConnection(),
    );
    const plain = {
      schemaVersion: 1 as const,
      scenarioId: 'plain_1',
      module: 'cashflow' as const,
      scenarioName: 'Plain Scenario',
      inputData: { startingCashMinor: 1000 },
      updatedAt: '2026-03-02T10:00:00.000Z',
    };

    await baseRepository.upsertScenario(plain);

    const vaultRepository = await WebVaultScenarioRepository.fromPassphrase({
      baseRepository,
      passphrase: 'vault-passphrase',
    });

    const listed = await vaultRepository.listScenarios();
    expect(listed.length).toBe(1);
    expect(listed[0]?.scenarioName).toBe('Plain Scenario');
    expect(
      (listed[0]?.inputData as { startingCashMinor?: number })
        .startingCashMinor,
    ).toBe(1000);
  });
});
