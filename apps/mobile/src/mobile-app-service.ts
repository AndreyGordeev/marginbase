import {
  type BillingVerifyRequest,
  type BillingVerifyResponse,
  MarginbaseApiClient,
  type EntitlementsResponse,
  type PurchasePlatform
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
  type EntitlementCache,
  type EntitlementSet,
  type ModuleId as EntitlementModuleId
} from '@marginbase/entitlements';
import {
  InMemorySecureKeyStore,
  SqlCipherConnection,
  SqlCipherScenarioRepository,
  type ScenarioRepository
} from '@marginbase/storage';

export type MobileModuleId = EntitlementModuleId;

export type MobileScreenRoute =
  | '/splash'
  | '/login'
  | '/gate'
  | '/home'
  | '/module/:moduleId/scenarios'
  | '/module/profit/editor/:scenarioId'
  | '/module/breakeven/editor/:scenarioId'
  | '/module/cashflow/editor/:scenarioId'
  | '/subscription'
  | '/settings'
  | '/legal/privacy'
  | '/legal/terms'
  | '/import-export-result'
  | '/error-modal'
  | '/empty-state';

export const MOBILE_SCREEN_ROUTES: readonly MobileScreenRoute[] = [
  '/splash',
  '/login',
  '/gate',
  '/home',
  '/module/:moduleId/scenarios',
  '/module/profit/editor/:scenarioId',
  '/module/breakeven/editor/:scenarioId',
  '/module/cashflow/editor/:scenarioId',
  '/subscription',
  '/settings',
  '/legal/privacy',
  '/legal/terms',
  '/import-export-result',
  '/error-modal',
  '/empty-state'
] as const;

const toPlainJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => toPlainJson(entry));
  }

  if (value && typeof value === 'object') {
    if ('toJSON' in value && typeof (value as { toJSON?: () => unknown }).toJSON === 'function') {
      return (value as { toJSON: () => unknown }).toJSON();
    }

    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
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

export interface MobileProfitInput {
  scenarioId?: string;
  scenarioName: string;
  unitPriceMinor: number;
  quantity: number;
  variableCostPerUnitMinor: number;
  fixedCostsMinor: number;
}

export interface MobileBreakEvenInput {
  scenarioId?: string;
  scenarioName: string;
  unitPriceMinor: number;
  variableCostPerUnitMinor: number;
  fixedCostsMinor: number;
  targetProfitMinor: number;
  plannedQuantity: number;
}

export interface MobileCashflowInput {
  scenarioId?: string;
  scenarioName: string;
  startingCashMinor: number;
  baseMonthlyRevenueMinor: number;
  fixedMonthlyCostsMinor: number;
  variableMonthlyCostsMinor: number;
  forecastMonths: number;
  monthlyGrowthRate: number;
}

export interface MobileImportResultSummary {
  kind: 'export_success' | 'import_success' | 'import_error';
  message: string;
  totalScenarios?: number;
  affectedModules?: MobileModuleId[];
}

export interface MobileEntitlementsApi {
  refreshEntitlements(idToken: string): Promise<EntitlementsResponse>;
  verifyBillingPurchase(request: BillingVerifyRequest): Promise<BillingVerifyResponse>;
  deleteAccount(request: { userId: string }): Promise<{ deleted: boolean }>;
}

const applyEntitlementsResponse = (cache: EntitlementCache, response: EntitlementsResponse): EntitlementCache => {
  return {
    ...cache,
    entitlementSet: {
      bundle: response.entitlements.bundle,
      profit: response.entitlements.profit,
      breakeven: response.entitlements.breakeven,
      cashflow: response.entitlements.cashflow
    },
    lastVerifiedAt: response.lastVerifiedAt
  };
};

export class MobileAppService {
  private entitlementCache: EntitlementCache;
  private lastRefreshAt: string | null;

  public constructor(
    private readonly scenarioRepository: ScenarioRepository,
    private readonly entitlementsApi?: MobileEntitlementsApi,
    private readonly nowProvider: () => Date = () => new Date()
  ) {
    this.entitlementCache = {
      entitlementSet: defaultEntitlements,
      lastVerifiedAt: nowIso()
    };
    this.lastRefreshAt = null;
  }

  public static async createDefault(): Promise<MobileAppService> {
    const connection = await SqlCipherConnection.initialize({
      secureKeyStore: new InMemorySecureKeyStore('android-keystore'),
      migrationStrategy: 'wipe'
    });

    return new MobileAppService(
      new SqlCipherScenarioRepository(connection),
      new MarginbaseApiClient({
        baseUrl: process.env.MARGINBASE_API_BASE_URL ?? 'https://api.marginbase.local'
      })
    );
  }

  public canOpenModule(moduleId: MobileModuleId): boolean {
    return canUseModule(moduleId, this.entitlementCache, new Date());
  }

  public activateBundle(): void {
    this.entitlementCache = {
      entitlementSet: { bundle: true, profit: true, breakeven: true, cashflow: true },
      lastVerifiedAt: nowIso()
    };
  }

  public async refreshEntitlementsIfNeeded(idToken: string): Promise<boolean> {
    if (!this.entitlementsApi) {
      return false;
    }

    const now = this.nowProvider();
    if (!shouldRefreshEntitlements(this.lastRefreshAt, now)) {
      return false;
    }

    const response = await this.entitlementsApi.refreshEntitlements(idToken);
    this.entitlementCache = applyEntitlementsResponse(this.entitlementCache, response);
    this.lastRefreshAt = now.toISOString();
    return true;
  }

  public async verifyPurchaseOnDevice(input: {
    userId: string;
    platform: PurchasePlatform;
    productId: string;
    receiptToken: string;
  }): Promise<BillingVerifyResponse> {
    if (!this.entitlementsApi) {
      throw new Error('Billing API client is not configured.');
    }

    const verified = await this.entitlementsApi.verifyBillingPurchase(input);
    this.entitlementCache = {
      entitlementSet: verified.entitlements,
      lastVerifiedAt: verified.lastVerifiedAt
    };
    this.lastRefreshAt = this.nowProvider().toISOString();
    return verified;
  }

  public async deleteAccount(userId: string): Promise<boolean> {
    if (!this.entitlementsApi) {
      throw new Error('Billing API client is not configured.');
    }

    const result = await this.entitlementsApi.deleteAccount({ userId });
    if (result.deleted) {
      this.entitlementCache = {
        entitlementSet: defaultEntitlements,
        lastVerifiedAt: nowIso()
      };
      this.lastRefreshAt = null;
    }

    return result.deleted;
  }

  public async listScenarios(moduleId: MobileModuleId): Promise<ScenarioV1[]> {
    return this.scenarioRepository.listScenarios(moduleId);
  }

  public async listAllScenarios(): Promise<ScenarioV1[]> {
    return this.scenarioRepository.listScenarios();
  }

  public async deleteScenario(scenarioId: string): Promise<void> {
    await this.scenarioRepository.deleteScenario(scenarioId);
  }

  public async duplicateScenario(scenarioId: string): Promise<ScenarioV1 | null> {
    const source = await this.scenarioRepository.getScenarioById(scenarioId);
    if (!source) {
      return null;
    }

    const duplicated: ScenarioV1 = {
      ...source,
      scenarioId: `${source.scenarioId}_copy_${Date.now()}`,
      scenarioName: `${source.scenarioName} Copy`,
      updatedAt: nowIso()
    };

    await this.scenarioRepository.upsertScenario(duplicated);
    return duplicated;
  }

  public async saveProfitScenario(input: MobileProfitInput): Promise<ScenarioV1> {
    const result = calculateProfit({
      mode: 'unit',
      unitPriceMinor: input.unitPriceMinor,
      quantity: input.quantity,
      variableCostPerUnitMinor: input.variableCostPerUnitMinor,
      fixedCostsMinor: input.fixedCostsMinor
    });

    const scenario: ScenarioV1 = {
      schemaVersion: 1,
      scenarioId: input.scenarioId ?? `mobile_profit_${Date.now()}`,
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
    };

    await this.scenarioRepository.upsertScenario(scenario);
    return scenario;
  }

  public async saveBreakEvenScenario(input: MobileBreakEvenInput): Promise<ScenarioV1> {
    const result = calculateBreakEven({
      unitPriceMinor: input.unitPriceMinor,
      variableCostPerUnitMinor: input.variableCostPerUnitMinor,
      fixedCostsMinor: input.fixedCostsMinor,
      targetProfitMinor: input.targetProfitMinor,
      plannedQuantity: input.plannedQuantity
    });

    const scenario: ScenarioV1 = {
      schemaVersion: 1,
      scenarioId: input.scenarioId ?? `mobile_break_even_${Date.now()}`,
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
    };

    await this.scenarioRepository.upsertScenario(scenario);
    return scenario;
  }

  public async saveCashflowScenario(input: MobileCashflowInput): Promise<ScenarioV1> {
    const result = calculateCashflow({
      startingCashMinor: input.startingCashMinor,
      baseMonthlyRevenueMinor: input.baseMonthlyRevenueMinor,
      fixedMonthlyCostsMinor: input.fixedMonthlyCostsMinor,
      variableMonthlyCostsMinor: input.variableMonthlyCostsMinor,
      forecastMonths: input.forecastMonths,
      monthlyGrowthRate: input.monthlyGrowthRate
    });

    const scenario: ScenarioV1 = {
      schemaVersion: 1,
      scenarioId: input.scenarioId ?? `mobile_cashflow_${Date.now()}`,
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
    };

    await this.scenarioRepository.upsertScenario(scenario);
    return scenario;
  }

  public async exportScenariosJson(): Promise<string> {
    return exportScenariosToJson(await this.scenarioRepository.listScenarios(), nowIso());
  }

  public previewImport(jsonText: string): ImportReplaceAllResult {
    return importScenariosReplaceAllFromJson(jsonText);
  }

  public async applyImport(result: ImportReplaceAllResult): Promise<MobileImportResultSummary> {
    if (!result.ok) {
      return {
        kind: 'import_error',
        message: result.errors[0]?.message ?? 'Import failed.'
      };
    }

    await this.scenarioRepository.replaceAllScenarios(result.scenarios);

    const affectedModules = [
      result.summary.profit > 0 ? 'profit' : null,
      result.summary.breakeven > 0 ? 'breakeven' : null,
      result.summary.cashflow > 0 ? 'cashflow' : null
    ].filter((entry): entry is MobileModuleId => Boolean(entry));

    return {
      kind: 'import_success',
      message: 'Import completed',
      totalScenarios: result.summary.total,
      affectedModules
    };
  }

  public createExportSuccessSummary(totalScenarios: number): MobileImportResultSummary {
    return {
      kind: 'export_success',
      message: 'Export completed',
      totalScenarios
    };
  }
}
