import { type ModuleId, type ScenarioV1 } from '@marginbase/domain-core';

/**
 * Factory for creating test scenarios with realistic data.
 * Use these to set up consistent test fixtures across unit/integration/E2E tests.
 */

const generateId = (): string => {
  return `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

export interface ScenarioFactoryOptions {
  scenarioId?: string;
  scenarioName?: string;
  updatedAt?: string;
  inputData?: Record<string, unknown>;
  calculatedData?: Record<string, unknown>;
}

/**
 * Create a minimal profit scenario with sample data
 */
export const profitScenarioFactory = (options: ScenarioFactoryOptions = {}): ScenarioV1 => {
  return {
    schemaVersion: 1,
    scenarioId: options.scenarioId ?? generateId(),
    module: 'profit',
    scenarioName: options.scenarioName ?? 'Sample Profit',
    inputData: options.inputData ?? {
      mode: 'revenue',
      revenue: 100000, // minor units
      costs: 50000,
      taxRate: 0.19
    },
    calculatedData: options.calculatedData,
    updatedAt: options.updatedAt ?? new Date().toISOString()
  };
};

/**
 * Create a minimal break-even scenario with sample data
 */
export const breakEvenScenarioFactory = (options: ScenarioFactoryOptions = {}): ScenarioV1 => {
  return {
    schemaVersion: 1,
    scenarioId: options.scenarioId ?? generateId(),
    module: 'breakeven',
    scenarioName: options.scenarioName ?? 'Sample Break-Even',
    inputData: options.inputData ?? {
      fixedCosts: 50000,
      variableCost: 20,
      price: 100
    },
    calculatedData: options.calculatedData,
    updatedAt: options.updatedAt ?? new Date().toISOString()
  };
};

/**
 * Create a minimal cashflow scenario with sample data
 */
export const cashflowScenarioFactory = (options: ScenarioFactoryOptions = {}): ScenarioV1 => {
  return {
    schemaVersion: 1,
    scenarioId: options.scenarioId ?? generateId(),
    module: 'cashflow',
    scenarioName: options.scenarioName ?? 'Sample Cashflow',
    inputData: options.inputData ?? {
      startingCash: 100000,
      months: [
        { month: 1, inflows: 50000, outflows: 30000 },
        { month: 2, inflows: 55000, outflows: 32000 },
        { month: 3, inflows: 60000, outflows: 35000 }
      ]
    },
    calculatedData: options.calculatedData,
    updatedAt: options.updatedAt ?? new Date().toISOString()
  };
};

/**
 * Create a scenario for a given module with optional overrides
 */
export const scenarioFactory = (module: ModuleId, options: ScenarioFactoryOptions = {}): ScenarioV1 => {
  switch (module) {
    case 'profit':
      return profitScenarioFactory(options);
    case 'breakeven':
      return breakEvenScenarioFactory(options);
    case 'cashflow':
      return cashflowScenarioFactory(options);
  }
};

/**
 * Batch create scenarios across multiple modules
 */
export const scenarioBatchFactory = (
  modules: ModuleId[] = ['profit', 'breakeven', 'cashflow'],
  baseOptions: ScenarioFactoryOptions = {}
): ScenarioV1[] => {
  return modules.map((module) => scenarioFactory(module, baseOptions));
};
