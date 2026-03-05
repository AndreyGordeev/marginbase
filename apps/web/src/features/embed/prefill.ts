export type EmbedModuleId = 'profit' | 'breakeven' | 'cashflow';

export interface PrefillPayload {
  module: EmbedModuleId;
  inputData: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isModule = (value: unknown): value is EmbedModuleId => {
  return value === 'profit' || value === 'breakeven' || value === 'cashflow';
};

export const encodePrefill = (payload: PrefillPayload): string => {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
};

export const decodePrefill = (encoded: string | null | undefined): PrefillPayload | null => {
  if (!encoded) {
    return null;
  }

  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as unknown;

    if (!isRecord(parsed) || !isModule(parsed.module) || !isRecord(parsed.inputData)) {
      return null;
    }

    return {
      module: parsed.module,
      inputData: parsed.inputData
    };
  } catch {
    return null;
  }
};

export const getPrefillFromSearch = (search: string): PrefillPayload | null => {
  const params = new URLSearchParams(search);
  return decodePrefill(params.get('prefill'));
};
