import {
  type ShareListItem,
  type ShareCreateResponse,
  type BillingPlanId,
  MarginbaseApiClient,
  type EntitlementsResponse
} from '@marginbase/api-client';
import { createTelemetryEvent, type TelemetryEventName } from '@marginbase/telemetry';
import {
  calculateBreakEven,
  calculateCashflow,
  calculateProfit,
  exportScenariosToJson,
  importScenariosReplaceAllFromJson,
  migrateSnapshot,
  sanitizeScenarioForShare,
  type SharedSnapshotV1,
  type BreakEvenInput,
  type CashflowInput,
  type ImportReplaceAllResult,
  type ProfitInput,
  type ScenarioV1
} from '@marginbase/domain-core';
import { buildReportModel, exportReportPdf, exportReportXlsx, type ReportModel } from '@marginbase/reporting';
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

type WebApiClient = Pick<MarginbaseApiClient, 'refreshEntitlements' | 'deleteAccount'> &
  Partial<Pick<MarginbaseApiClient, 'createCheckoutSession' | 'createShareSnapshot' | 'getShareSnapshot' | 'deleteShareSnapshot' | 'listShareSnapshots' | 'sendTelemetryBatch'>>;

const SIGNED_IN_STORAGE_KEY = 'marginbase_signed_in';
const SIGNED_IN_USER_ID_STORAGE_KEY = 'marginbase_signed_in_user_id';

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

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getLatestScenariosByModule = (scenarios: ScenarioV1[]): Partial<Record<ScenarioV1['module'], ScenarioV1>> => {
  const latest: Partial<Record<ScenarioV1['module'], ScenarioV1>> = {};

  for (const scenario of scenarios) {
    const current = latest[scenario.module];
    if (!current || new Date(scenario.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
      latest[scenario.module] = scenario;
    }
  }

  return latest;
};

const toProfitInput = (scenario?: ScenarioV1): ProfitInput | undefined => {
  if (!scenario || scenario.module !== 'profit') {
    return undefined;
  }

  const unitPriceMinor = toFiniteNumber(scenario.inputData.unitPriceMinor);
  const quantity = toFiniteNumber(scenario.inputData.quantity);
  const variableCostPerUnitMinor = toFiniteNumber(scenario.inputData.variableCostPerUnitMinor);
  const fixedCostsMinor = toFiniteNumber(scenario.inputData.fixedCostsMinor);

  if (
    unitPriceMinor === null ||
    quantity === null ||
    variableCostPerUnitMinor === null ||
    fixedCostsMinor === null
  ) {
    return undefined;
  }

  return {
    mode: 'unit',
    unitPriceMinor,
    quantity,
    variableCostPerUnitMinor,
    fixedCostsMinor
  };
};

const toBreakEvenInput = (scenario?: ScenarioV1): BreakEvenInput | undefined => {
  if (!scenario || scenario.module !== 'breakeven') {
    return undefined;
  }

  const unitPriceMinor = toFiniteNumber(scenario.inputData.unitPriceMinor);
  const variableCostPerUnitMinor = toFiniteNumber(scenario.inputData.variableCostPerUnitMinor);
  const fixedCostsMinor = toFiniteNumber(scenario.inputData.fixedCostsMinor);
  const targetProfitMinor = toFiniteNumber(scenario.inputData.targetProfitMinor);
  const plannedQuantity = toFiniteNumber(scenario.inputData.plannedQuantity);

  if (unitPriceMinor === null || variableCostPerUnitMinor === null || fixedCostsMinor === null) {
    return undefined;
  }

  return {
    unitPriceMinor,
    variableCostPerUnitMinor,
    fixedCostsMinor,
    targetProfitMinor: targetProfitMinor ?? undefined,
    plannedQuantity: plannedQuantity ?? undefined
  };
};

const toCashflowInput = (scenario?: ScenarioV1): CashflowInput | undefined => {
  if (!scenario || scenario.module !== 'cashflow') {
    return undefined;
  }

  const startingCashMinor = toFiniteNumber(scenario.inputData.startingCashMinor);
  const baseMonthlyRevenueMinor = toFiniteNumber(scenario.inputData.baseMonthlyRevenueMinor);
  const fixedMonthlyCostsMinor = toFiniteNumber(scenario.inputData.fixedMonthlyCostsMinor);
  const variableMonthlyCostsMinor = toFiniteNumber(scenario.inputData.variableMonthlyCostsMinor);
  const forecastMonths = toFiniteNumber(scenario.inputData.forecastMonths);
  const monthlyGrowthRate = toFiniteNumber(scenario.inputData.monthlyGrowthRate);

  if (
    startingCashMinor === null ||
    baseMonthlyRevenueMinor === null ||
    fixedMonthlyCostsMinor === null ||
    variableMonthlyCostsMinor === null ||
    forecastMonths === null
  ) {
    return undefined;
  }

  return {
    startingCashMinor,
    baseMonthlyRevenueMinor,
    fixedMonthlyCostsMinor,
    variableMonthlyCostsMinor,
    forecastMonths,
    monthlyGrowthRate: monthlyGrowthRate ?? 0
  };
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
  private readonly apiClient: WebApiClient;

  public constructor(
    scenarioRepository: ScenarioRepository,
    apiClient: WebApiClient = new MarginbaseApiClient({
      baseUrl: 'https://api.marginbase.local'
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

  public async startCheckoutSession(planId: BillingPlanId, userId: string, email: string): Promise<string | null> {
    if (!this.apiClient.createCheckoutSession) {
      return null;
    }

    const response = await this.apiClient.createCheckoutSession({
      planId,
      userId,
      email
    });

    return response.checkoutUrl;
  }

  public canOpenModule(moduleId: ModuleId): boolean {
    return canUseModule(moduleId, this.entitlementCache, new Date());
  }

  public isSignedIn(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(SIGNED_IN_STORAGE_KEY) === 'true';
  }

  public getSignedInUserId(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const value = localStorage.getItem(SIGNED_IN_USER_ID_STORAGE_KEY);
    return value && value.trim() ? value : null;
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

  public async getBusinessReportModel(): Promise<ReportModel> {
    const scenarios = await this.scenarioRepository.listScenarios();
    const latestByModule = getLatestScenariosByModule(scenarios);

    return buildReportModel({
      generatedAtLocal: nowIso(),
      currencyCode: 'EUR',
      locale: 'en-US',
      profitabilityInput: toProfitInput(latestByModule.profit),
      breakEvenInput: toBreakEvenInput(latestByModule.breakeven),
      cashflowInput: toCashflowInput(latestByModule.cashflow)
    });
  }

  public async exportBusinessReportPdf(): Promise<Uint8Array> {
    const report = await this.getBusinessReportModel();

    return exportReportPdf(report);
  }

  public async exportBusinessReportXlsx(): Promise<Uint8Array> {
    const report = await this.getBusinessReportModel();

    return exportReportXlsx(report);
  }

  public async createShareSnapshotFromScenario(scenario: ScenarioV1, expiresInDays: 7 | 30 = 30): Promise<ShareCreateResponse> {
    if (!this.apiClient.createShareSnapshot) {
      throw new Error('Share API is not available in the current environment.');
    }

    const snapshot = sanitizeScenarioForShare(scenario);

    return this.apiClient.createShareSnapshot({
      snapshot,
      expiresInDays,
      ownerUserId: this.getSignedInUserId() ?? undefined
    });
  }

  public async deleteShareSnapshot(token: string, idToken?: string): Promise<boolean> {
    if (!this.apiClient.deleteShareSnapshot) {
      throw new Error('Share API is not available in the current environment.');
    }

    const result = await this.apiClient.deleteShareSnapshot(token, idToken);
    return result.revoked;
  }

  public async listMyShareSnapshots(): Promise<ShareListItem[]> {
    if (!this.isSignedIn()) {
      throw new Error('Sign in is required to view shared links.');
    }

    const userId = this.getSignedInUserId();
    if (!userId) {
      throw new Error('Signed in user ID is missing.');
    }

    if (!this.apiClient.listShareSnapshots) {
      throw new Error('Share API is not available in the current environment.');
    }

    const result = await this.apiClient.listShareSnapshots(userId);
    return result.items;
  }

  public async revokeMyShareSnapshot(token: string): Promise<boolean> {
    if (!this.isSignedIn()) {
      throw new Error('Sign in is required to revoke shared links.');
    }

    return this.deleteShareSnapshot(token);
  }

  public async trackEmbedOpened(moduleId: ModuleId, poweredBy: boolean): Promise<void> {
    await this.emitTelemetryEvent('embed_opened', {
      moduleId,
      poweredBy
    });
  }

  public async trackEmbedCtaClicked(moduleId: ModuleId): Promise<void> {
    await this.emitTelemetryEvent('embed_cta_clicked', {
      moduleId
    });
  }

  public async importSharedScenario(token: string): Promise<ModuleId> {
    if (!this.isSignedIn()) {
      throw new Error('Sign in is required to import shared scenarios.');
    }

    const snapshot = await this.getSharedSnapshot(token);
    await this.persistSharedSnapshot(snapshot, 'Imported Shared Scenario');
    return snapshot.module;
  }

  public async saveSharedScenario(token: string): Promise<ModuleId> {
    if (!this.isSignedIn()) {
      throw new Error('Sign in is required to save shared scenarios.');
    }

    const snapshot = await this.getSharedSnapshot(token);

    if (!this.canOpenModule(snapshot.module)) {
      throw new Error('Active entitlement is required to save this shared scenario.');
    }

    await this.persistSharedSnapshot(snapshot, 'Saved Shared Scenario');
    return snapshot.module;
  }

  public async getSharedScenarioView(token: string): Promise<{
    module: ModuleId;
    inputData: Record<string, unknown>;
    calculatedData: Record<string, unknown>;
  }> {
    if (!this.apiClient.getShareSnapshot) {
      throw new Error('Share API is not available in the current environment.');
    }

    const snapshot = await this.getSharedSnapshot(token);

    if (snapshot.module === 'profit') {
      const input = this.getProfitInputState(snapshot.inputData);
      const calculatedData = calculateProfit({
        mode: 'unit',
        unitPriceMinor: input.unitPriceMinor,
        quantity: input.quantity,
        variableCostPerUnitMinor: input.variableCostPerUnitMinor,
        fixedCostsMinor: input.fixedCostsMinor
      });

      return {
        module: 'profit',
        inputData: snapshot.inputData,
        calculatedData: toPlainJson(calculatedData) as Record<string, unknown>
      };
    }

    if (snapshot.module === 'breakeven') {
      const input = this.getBreakEvenInputState(snapshot.inputData);
      const calculatedData = calculateBreakEven({
        unitPriceMinor: input.unitPriceMinor,
        variableCostPerUnitMinor: input.variableCostPerUnitMinor,
        fixedCostsMinor: input.fixedCostsMinor,
        targetProfitMinor: input.targetProfitMinor,
        plannedQuantity: input.plannedQuantity
      });

      return {
        module: 'breakeven',
        inputData: snapshot.inputData,
        calculatedData: toPlainJson(calculatedData) as Record<string, unknown>
      };
    }

    const input = this.getCashflowInputState(snapshot.inputData);
    const calculatedData = calculateCashflow({
      startingCashMinor: input.startingCashMinor,
      baseMonthlyRevenueMinor: input.baseMonthlyRevenueMinor,
      fixedMonthlyCostsMinor: input.fixedMonthlyCostsMinor,
      variableMonthlyCostsMinor: input.variableMonthlyCostsMinor,
      forecastMonths: input.forecastMonths,
      monthlyGrowthRate: input.monthlyGrowthRate
    });

    return {
      module: 'cashflow',
      inputData: snapshot.inputData,
      calculatedData: toPlainJson(calculatedData) as Record<string, unknown>
    };
  }

  private async getSharedSnapshot(token: string): Promise<SharedSnapshotV1> {
    if (!this.apiClient.getShareSnapshot) {
      throw new Error('Share API is not available in the current environment.');
    }

    const response = await this.apiClient.getShareSnapshot(token);
    return migrateSnapshot(response.snapshot);
  }

  private async persistSharedSnapshot(snapshot: SharedSnapshotV1, scenarioNamePrefix: string): Promise<void> {
    const scenarioName = `${scenarioNamePrefix} (${snapshot.module})`;
    const scenarioId = `shared_${snapshot.module}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;

    if (snapshot.module === 'profit') {
      const input = this.getProfitInputState(snapshot.inputData);
      await this.saveProfitScenario({
        scenarioId,
        scenarioName,
        unitPriceMinor: input.unitPriceMinor,
        quantity: input.quantity,
        variableCostPerUnitMinor: input.variableCostPerUnitMinor,
        fixedCostsMinor: input.fixedCostsMinor
      });
      return;
    }

    if (snapshot.module === 'breakeven') {
      const input = this.getBreakEvenInputState(snapshot.inputData);
      await this.saveBreakEvenScenario({
        scenarioId,
        scenarioName,
        unitPriceMinor: input.unitPriceMinor,
        variableCostPerUnitMinor: input.variableCostPerUnitMinor,
        fixedCostsMinor: input.fixedCostsMinor,
        targetProfitMinor: input.targetProfitMinor,
        plannedQuantity: input.plannedQuantity
      });
      return;
    }

    const input = this.getCashflowInputState(snapshot.inputData);
    await this.saveCashflowScenario({
      scenarioId,
      scenarioName,
      startingCashMinor: input.startingCashMinor,
      baseMonthlyRevenueMinor: input.baseMonthlyRevenueMinor,
      fixedMonthlyCostsMinor: input.fixedMonthlyCostsMinor,
      variableMonthlyCostsMinor: input.variableMonthlyCostsMinor,
      forecastMonths: input.forecastMonths,
      monthlyGrowthRate: input.monthlyGrowthRate
    });
  }

  private async emitTelemetryEvent(name: TelemetryEventName, attributes: Record<string, string | boolean>): Promise<void> {
    if (!this.apiClient.sendTelemetryBatch) {
      return;
    }

    try {
      const event = createTelemetryEvent(name, attributes);
      await this.apiClient.sendTelemetryBatch({
        userId: this.getSignedInUserId() ?? 'anonymous',
        events: [
          {
            name: event.name,
            timestamp: event.occurredAt,
            attributes: event.properties
          }
        ]
      });
    } catch {
      return;
    }
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
