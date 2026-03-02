import {
  MarginbaseApiClient,
  type EntitlementsResponse
} from '@marginbase/api-client';
import {
  calculateBreakEven,
  calculateCashflow,
  calculateProfit,
  exportScenariosToJson,
  importScenariosReplaceAllFromJson,
  type ImportReplaceAllResult,
  type ScenarioV1
} from '@marginbase/domain-core';
import {
  canUseModule,
  shouldRefreshEntitlements,
  type ModuleId as EntitlementModuleId,
  type EntitlementCache,
  type EntitlementSet
} from '@marginbase/entitlements';
import {
  IndexedDbConnection,
  IndexedDbScenarioRepository,
  SqlitePlaceholderConnection,
  SqlitePlaceholderScenarioRepository,
  WebVaultScenarioRepository,
  type ScenarioRepository
} from '@marginbase/storage';

type ModuleId = EntitlementModuleId;

const toPlainJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => toPlainJson(entry));
  }

  if (value && typeof value === 'object') {
    if ('toJSON' in value && typeof (value as { toJSON?: () => unknown }).toJSON === 'function') {
      return (value as { toJSON: () => unknown }).toJSON();
    }

    const asRecord = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(asRecord)) {
      output[key] = toPlainJson(entry);
    }
    return output;
  }

  return value;
};

const nowIso = (): string => new Date().toISOString();

const defaultEntitlements: EntitlementSet = {
  bundle: false,
  profit: true,
  breakeven: false,
  cashflow: false
};

const VAULT_SALT_STORAGE_KEY = 'marginbase_vault_salt';

const loadEntitlementCache = (): EntitlementCache => {
  if (typeof localStorage === 'undefined') {
    return { entitlementSet: defaultEntitlements, lastVerifiedAt: nowIso() };
  }

  const raw = localStorage.getItem('marginbase_entitlements');
  if (!raw) {
    return { entitlementSet: defaultEntitlements, lastVerifiedAt: nowIso() };
  }

  try {
    const parsed = JSON.parse(raw) as EntitlementCache;
    return parsed;
  } catch {
    return { entitlementSet: defaultEntitlements, lastVerifiedAt: nowIso() };
  }
};

const saveEntitlementCache = (cache: EntitlementCache): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('marginbase_entitlements', JSON.stringify(cache));
  }
};

export interface ProfitInputState {
  scenarioName: string;
  unitPriceMinor: number;
  quantity: number;
  variableCostPerUnitMinor: number;
  fixedCostsMinor: number;
}

export interface BreakEvenInputState {
  scenarioName: string;
  unitPriceMinor: number;
  variableCostPerUnitMinor: number;
  fixedCostsMinor: number;
  targetProfitMinor: number;
  plannedQuantity: number;
}

export interface CashflowInputState {
  scenarioName: string;
  startingCashMinor: number;
  baseMonthlyRevenueMinor: number;
  fixedMonthlyCostsMinor: number;
  variableMonthlyCostsMinor: number;
  forecastMonths: number;
  monthlyGrowthRate: number;
}

export class WebAppService {
  private readonly baseScenarioRepository: ScenarioRepository;
  private scenarioRepository: ScenarioRepository;
  private entitlementCache: EntitlementCache;
  private lastRefreshAt: string | null;
  private vaultEnabled: boolean;
  private readonly apiClient: Pick<MarginbaseApiClient, 'refreshEntitlements' | 'deleteAccount'>;

  public constructor(
    scenarioRepository: ScenarioRepository,
    apiClient: Pick<MarginbaseApiClient, 'refreshEntitlements' | 'deleteAccount'> = new MarginbaseApiClient({
      baseUrl: process.env.MARGINBASE_API_BASE_URL ?? 'https://api.marginbase.local'
    })
  ) {
    this.baseScenarioRepository = scenarioRepository;
    this.scenarioRepository = scenarioRepository;
    this.entitlementCache = loadEntitlementCache();
    this.lastRefreshAt = null;
    this.vaultEnabled = false;
    this.apiClient = apiClient;
  }

  public static createDefault(): WebAppService {
    if (typeof indexedDB !== 'undefined') {
      const connection = new IndexedDbConnection('marginbase-web');
      return new WebAppService(new IndexedDbScenarioRepository(connection));
    }

    const connection = new SqlitePlaceholderConnection();
    return new WebAppService(new SqlitePlaceholderScenarioRepository(connection));
  }

  public activateTrial(): void {
    this.entitlementCache = {
      entitlementSet: { ...this.entitlementCache.entitlementSet, profit: true },
      lastVerifiedAt: nowIso()
    };
    saveEntitlementCache(this.entitlementCache);
  }

  public activateBundle(): void {
    this.entitlementCache = {
      entitlementSet: { bundle: true, profit: true, breakeven: true, cashflow: true },
      lastVerifiedAt: nowIso()
    };
    saveEntitlementCache(this.entitlementCache);
  }

  public canOpenModule(moduleId: ModuleId): boolean {
    return canUseModule(moduleId, this.entitlementCache, new Date());
  }

  public async refreshEntitlementsIfNeeded(idToken: string): Promise<boolean> {
    if (!shouldRefreshEntitlements(this.lastRefreshAt, new Date())) {
      return false;
    }

    const response = await this.apiClient.refreshEntitlements(idToken);
    this.applyEntitlementsResponse(response);
    this.lastRefreshAt = nowIso();
    return true;
  }

  public async deleteAccount(userId: string): Promise<boolean> {
    const result = await this.apiClient.deleteAccount({ userId });

    if (result.deleted) {
      this.entitlementCache = {
        entitlementSet: defaultEntitlements,
        lastVerifiedAt: nowIso()
      };
      this.lastRefreshAt = null;
      saveEntitlementCache(this.entitlementCache);
    }

    return result.deleted;
  }

  public canUseVault(): boolean {
    return this.entitlementCache.entitlementSet.bundle || this.entitlementCache.entitlementSet.breakeven || this.entitlementCache.entitlementSet.cashflow;
  }

  public isVaultEnabled(): boolean {
    return this.vaultEnabled;
  }

  public async enableLocalVault(passphrase: string): Promise<void> {
    if (!this.canUseVault()) {
      throw new Error('Vault is available only for paid entitlements.');
    }

    const existingSalt = this.getVaultSalt();
    const vaultRepository = await WebVaultScenarioRepository.fromPassphrase({
      baseRepository: this.baseScenarioRepository,
      passphrase,
      saltBase64: existingSalt ?? undefined
    });

    if (!existingSalt) {
      const existingScenarios = await this.scenarioRepository.listScenarios();
      await vaultRepository.replaceAllScenarios(existingScenarios);
      this.setVaultSalt(vaultRepository.saltBase64);
      this.scenarioRepository = vaultRepository;
      this.vaultEnabled = true;
      return;
    }

    await vaultRepository.listScenarios();
    this.scenarioRepository = vaultRepository;
    this.vaultEnabled = true;
  }

  public async listScenarios(moduleId: ModuleId): Promise<ScenarioV1[]> {
    return this.scenarioRepository.listScenarios(moduleId);
  }

  public async listAllScenarios(): Promise<ScenarioV1[]> {
    return this.scenarioRepository.listScenarios();
  }

  public async deleteScenario(scenarioId: string): Promise<void> {
    await this.scenarioRepository.deleteScenario(scenarioId);
  }

  public async createDefaultScenario(moduleId: ModuleId): Promise<void> {
    if (moduleId === 'profit') {
      await this.saveProfitScenario({
        scenarioName: 'New Profit Scenario',
        unitPriceMinor: 1000,
        quantity: 10,
        variableCostPerUnitMinor: 700,
        fixedCostsMinor: 1000
      });
    }

    if (moduleId === 'breakeven') {
      await this.saveBreakEvenScenario({
        scenarioName: 'New Break-even Scenario',
        unitPriceMinor: 1000,
        variableCostPerUnitMinor: 700,
        fixedCostsMinor: 5000,
        targetProfitMinor: 0,
        plannedQuantity: 20
      });
    }

    if (moduleId === 'cashflow') {
      await this.saveCashflowScenario({
        scenarioName: 'New Cashflow Scenario',
        startingCashMinor: 100_000,
        baseMonthlyRevenueMinor: 30_000,
        fixedMonthlyCostsMinor: 20_000,
        variableMonthlyCostsMinor: 5_000,
        forecastMonths: 6,
        monthlyGrowthRate: 0.02
      });
    }
  }

  public getProfitInputState(inputData?: Record<string, unknown>): ProfitInputState {
    return {
      scenarioName: 'Profit Scenario',
      unitPriceMinor: Number(inputData?.unitPriceMinor ?? 1000),
      quantity: Number(inputData?.quantity ?? 10),
      variableCostPerUnitMinor: Number(inputData?.variableCostPerUnitMinor ?? 700),
      fixedCostsMinor: Number(inputData?.fixedCostsMinor ?? 1000)
    };
  }

  public getBreakEvenInputState(inputData?: Record<string, unknown>): BreakEvenInputState {
    return {
      scenarioName: 'Break-even Scenario',
      unitPriceMinor: Number(inputData?.unitPriceMinor ?? 1000),
      variableCostPerUnitMinor: Number(inputData?.variableCostPerUnitMinor ?? 700),
      fixedCostsMinor: Number(inputData?.fixedCostsMinor ?? 5000),
      targetProfitMinor: Number(inputData?.targetProfitMinor ?? 0),
      plannedQuantity: Number(inputData?.plannedQuantity ?? 20)
    };
  }

  public getCashflowInputState(inputData?: Record<string, unknown>): CashflowInputState {
    return {
      scenarioName: 'Cashflow Scenario',
      startingCashMinor: Number(inputData?.startingCashMinor ?? 100_000),
      baseMonthlyRevenueMinor: Number(inputData?.baseMonthlyRevenueMinor ?? 30_000),
      fixedMonthlyCostsMinor: Number(inputData?.fixedMonthlyCostsMinor ?? 20_000),
      variableMonthlyCostsMinor: Number(inputData?.variableMonthlyCostsMinor ?? 5_000),
      forecastMonths: Number(inputData?.forecastMonths ?? 6),
      monthlyGrowthRate: Number(inputData?.monthlyGrowthRate ?? 0)
    };
  }

  public async saveProfitScenario(input: ProfitInputState & { scenarioId?: string }): Promise<void> {
    const result = calculateProfit({
      mode: 'unit',
      unitPriceMinor: input.unitPriceMinor,
      quantity: input.quantity,
      variableCostPerUnitMinor: input.variableCostPerUnitMinor,
      fixedCostsMinor: input.fixedCostsMinor
    });

    await this.scenarioRepository.upsertScenario({
      schemaVersion: 1,
      scenarioId: input.scenarioId ?? `profit_${Date.now()}`,
      module: 'profit',
      scenarioName: input.scenarioName,
      inputData: {
        unitPriceMinor: input.unitPriceMinor,
        quantity: input.quantity,
        variableCostPerUnitMinor: input.variableCostPerUnitMinor,
        fixedCostsMinor: input.fixedCostsMinor
      },
      calculatedData: toPlainJson(result) as Record<string, unknown>,
      updatedAt: nowIso()
    });
  }

  public async saveBreakEvenScenario(input: BreakEvenInputState & { scenarioId?: string }): Promise<void> {
    const result = calculateBreakEven({
      unitPriceMinor: input.unitPriceMinor,
      variableCostPerUnitMinor: input.variableCostPerUnitMinor,
      fixedCostsMinor: input.fixedCostsMinor,
      targetProfitMinor: input.targetProfitMinor,
      plannedQuantity: input.plannedQuantity
    });

    await this.scenarioRepository.upsertScenario({
      schemaVersion: 1,
      scenarioId: input.scenarioId ?? `break_even_${Date.now()}`,
      module: 'breakeven',
      scenarioName: input.scenarioName,
      inputData: {
        unitPriceMinor: input.unitPriceMinor,
        variableCostPerUnitMinor: input.variableCostPerUnitMinor,
        fixedCostsMinor: input.fixedCostsMinor,
        targetProfitMinor: input.targetProfitMinor,
        plannedQuantity: input.plannedQuantity
      },
      calculatedData: toPlainJson(result) as Record<string, unknown>,
      updatedAt: nowIso()
    });
  }

  public async saveCashflowScenario(input: CashflowInputState & { scenarioId?: string }): Promise<void> {
    const result = calculateCashflow({
      startingCashMinor: input.startingCashMinor,
      baseMonthlyRevenueMinor: input.baseMonthlyRevenueMinor,
      fixedMonthlyCostsMinor: input.fixedMonthlyCostsMinor,
      variableMonthlyCostsMinor: input.variableMonthlyCostsMinor,
      forecastMonths: input.forecastMonths,
      monthlyGrowthRate: input.monthlyGrowthRate
    });

    await this.scenarioRepository.upsertScenario({
      schemaVersion: 1,
      scenarioId: input.scenarioId ?? `cashflow_${Date.now()}`,
      module: 'cashflow',
      scenarioName: input.scenarioName,
      inputData: {
        startingCashMinor: input.startingCashMinor,
        baseMonthlyRevenueMinor: input.baseMonthlyRevenueMinor,
        fixedMonthlyCostsMinor: input.fixedMonthlyCostsMinor,
        variableMonthlyCostsMinor: input.variableMonthlyCostsMinor,
        forecastMonths: input.forecastMonths,
        monthlyGrowthRate: input.monthlyGrowthRate
      },
      calculatedData: toPlainJson(result) as Record<string, unknown>,
      updatedAt: nowIso()
    });
  }

  public async exportScenariosJson(): Promise<string> {
    const scenarios = await this.scenarioRepository.listScenarios();
    return exportScenariosToJson(scenarios, nowIso());
  }

  public previewImport(json: string): ImportReplaceAllResult {
    return importScenariosReplaceAllFromJson(json);
  }

  public async applyImport(result: ImportReplaceAllResult): Promise<void> {
    if (!result.ok) {
      throw new Error('Cannot apply failed import result.');
    }

    await this.scenarioRepository.replaceAllScenarios(result.scenarios);
  }

  private getVaultSalt(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(VAULT_SALT_STORAGE_KEY);
  }

  private setVaultSalt(saltBase64: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(VAULT_SALT_STORAGE_KEY, saltBase64);
  }

  private applyEntitlementsResponse(response: EntitlementsResponse): void {
    this.entitlementCache = {
      entitlementSet: {
        bundle: response.entitlements.bundle,
        profit: response.entitlements.profit,
        breakeven: response.entitlements.breakeven,
        cashflow: response.entitlements.cashflow
      },
      lastVerifiedAt: response.lastVerifiedAt
    };

    saveEntitlementCache(this.entitlementCache);
  }
}
