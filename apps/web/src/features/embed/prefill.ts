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

const encodeBase64 = (str: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64url');
  }
  // Browser: use btoa for base64url encoding
  const base64 = btoa(new TextEncoder().encode(str) as unknown as string);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const decodeBase64 = (str: string): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64url').toString('utf8');
  }
  // Browser: use atob for base64url decoding
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padding);
  return new TextDecoder().decode(Uint8Array.from(atob(padded), c => c.charCodeAt(0)));
};

export const encodePrefill = (payload: PrefillPayload): string => {
  const json = JSON.stringify(payload);
  return encodeBase64(json);
};

export const decodePrefill = (encoded: string | null | undefined): PrefillPayload | null => {
  if (!encoded) {
    return null;
  }

  try {
    const json = decodeBase64(encoded);
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
