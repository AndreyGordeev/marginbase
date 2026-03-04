import {
  exportScenariosToJson,
  importScenariosReplaceAllFromJson,
  type ImportReplaceAllResult,
  type ScenarioV1
} from '@marginbase/domain-core';

export const exportScenariosAsJson = (scenarios: ScenarioV1[], generatedAt: string): string => {
  return exportScenariosToJson(scenarios, generatedAt);
};

export const previewImportReplaceAll = (json: string): ImportReplaceAllResult => {
  return importScenariosReplaceAllFromJson(json);
};

export const getImportScenariosOrThrow = (result: ImportReplaceAllResult): ScenarioV1[] => {
  if (!result.ok) {
    throw new Error('Cannot apply failed import result.');
  }

  return result.scenarios;
};
