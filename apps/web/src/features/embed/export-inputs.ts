import type { EmbedModuleId } from './prefill';

interface EmbedInputExportPayload {
  module: EmbedModuleId;
  exportedAt: string;
  inputData: Record<string, number>;
}

export const downloadEmbedInputsJson = (module: EmbedModuleId, inputData: Record<string, number>): void => {
  const payload: EmbedInputExportPayload = {
    module,
    exportedAt: new Date().toISOString(),
    inputData
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `marginbase-embed-${module}-inputs.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};
