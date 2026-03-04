import type { EncryptedShareSnapshotV1, ShareGetResponse } from '@marginbase/api-client';
import { migrateSnapshot, sanitizeScenarioForShare, type ScenarioV1, type SharedSnapshotV1 } from '@marginbase/domain-core';
import { decryptShareSnapshot, encryptShareSnapshot, generateShareKey } from '../../features/share/share-crypto';

export const createEncryptedShareSnapshotFromScenario = async (
  scenario: ScenarioV1
): Promise<{ encryptedSnapshot: EncryptedShareSnapshotV1; shareKey: string }> => {
  const snapshot = sanitizeScenarioForShare(scenario);
  const shareKey = generateShareKey();
  const encryptedSnapshot = await encryptShareSnapshot(snapshot, shareKey);

  return {
    encryptedSnapshot,
    shareKey
  };
};

export const resolveSharedSnapshot = async (
  response: ShareGetResponse,
  shareKey: string | null
): Promise<SharedSnapshotV1> => {
  if (response.snapshot) {
    return migrateSnapshot(response.snapshot);
  }

  if (!response.encryptedSnapshot) {
    throw new Error('Shared snapshot payload is missing.');
  }

  if (!shareKey) {
    throw new Error('Share link key is missing. Please use the full original link.');
  }

  const decrypted = await decryptShareSnapshot(response.encryptedSnapshot, shareKey);
  return migrateSnapshot(decrypted);
};
