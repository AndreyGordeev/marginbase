import {
  type ShareListItem,
  type ShareCreateResponse,
  type BillingPlanId,
  MarginbaseApiClient
} from '@marginbase/api-client';
import { createTelemetryEvent, type TelemetryEventName } from '@marginbase/telemetry';
import {
  calculateBreakEven,
  calculateCashflow,
  calculateProfit,
  type SharedSnapshotV1,
  type ImportReplaceAllResult,
  type ScenarioV1
} from '@marginbase/domain-core';
import { exportReportPdf, exportReportXlsx, type ReportModel } from '@marginbase/reporting';
import {
  canUseModule,
  shouldRefreshEntitlements,
  type ModuleId as EntitlementModuleId,
  type EntitlementCache
} from '@marginbase/entitlements';
import {
  createBundleEntitlementCache,
  createDefaultEntitlementCache,
  createEntitlementCacheFromResponse,
  createTrialEntitlementCache,
  loadEntitlementCache,
  saveEntitlementCache
} from './services/internal/entitlement-cache';
import { toPlainJson } from './services/internal/plain-json';
import {
  getBusinessReportExportWatermark,
  hasPaidEntitlement,
  isExportWatermarked
} from './services/internal/report-export-policy';
import { buildBusinessReportModelFromScenarios } from './services/internal/report-inputs';
import {
  createEncryptedShareSnapshotFromScenario,
  resolveSharedSnapshot
} from './services/internal/share-snapshot';
import {
  exportScenariosAsJson,
  getImportScenariosOrThrow,
  previewImportReplaceAll
} from './services/internal/scenario-io';
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
  Partial<Pick<MarginbaseApiClient, 'createCheckoutSession' | 'createBillingPortalSession' | 'createShareSnapshot' | 'getShareSnapshot' | 'deleteShareSnapshot' | 'listShareSnapshots' | 'sendTelemetryBatch'>>;

const SIGNED_IN_STORAGE_KEY = 'marginbase_signed_in';
const SIGNED_IN_USER_ID_STORAGE_KEY = 'marginbase_signed_in_user_id';
const TELEMETRY_CONSENT_STORAGE_KEY = 'marginbase_telemetry_consent';
const FIRST_RUN_DEMO_SCENARIOS_KEY = 'marginbase_first_run_demo_scenarios_seeded';
const FREE_PLAN_SCENARIO_LIMIT = 3;

const nowIso = (): string => new Date().toISOString();

const VAULT_SALT_STORAGE_KEY = 'marginbase_vault_salt';

export type TelemetryConsentState = 'enabled' | 'disabled' | 'not_decided';

const isTelemetryConsentState = (value: string): value is TelemetryConsentState => {
  return value === 'enabled' || value === 'disabled' || value === 'not_decided';
};

const loadTelemetryConsentState = (): TelemetryConsentState => {
  if (typeof localStorage === 'undefined') {
    return 'disabled';
  }

  const value = localStorage.getItem(TELEMETRY_CONSENT_STORAGE_KEY);
  if (!value || !isTelemetryConsentState(value)) {
    return 'disabled';
  }

  return value;
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

export interface ShareCreateLocalResult extends ShareCreateResponse {
  shareKey: string;
}

export class WebAppService {
  private readonly baseScenarioRepository: ScenarioRepository;
  private scenarioRepository: ScenarioRepository;
  private entitlementCache: EntitlementCache;
  private lastRefreshAt: string | null;
  private vaultEnabled: boolean;
  private telemetryConsentState: TelemetryConsentState;
  private readonly apiClient: WebApiClient;

  public constructor(
    scenarioRepository: ScenarioRepository,
    apiClient: WebApiClient = new MarginbaseApiClient({
      baseUrl: 'https://api.marginbase.local'
    })
  ) {
    this.baseScenarioRepository = scenarioRepository;
    this.scenarioRepository = scenarioRepository;
    this.entitlementCache = loadEntitlementCache(nowIso);
    this.lastRefreshAt = null;
    this.vaultEnabled = false;
    this.telemetryConsentState = loadTelemetryConsentState();
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
    this.entitlementCache = createTrialEntitlementCache(this.entitlementCache, nowIso);
    saveEntitlementCache(this.entitlementCache);
  }

  public activateBundle(): void {
    this.entitlementCache = createBundleEntitlementCache(nowIso);
    saveEntitlementCache(this.entitlementCache);
  }

  public async ensureFirstRunDemoScenarios(): Promise<void> {
    const hasLocalStorage = typeof localStorage !== 'undefined';
    const alreadySeeded = hasLocalStorage && localStorage.getItem(FIRST_RUN_DEMO_SCENARIOS_KEY) === 'true';

    if (alreadySeeded) {
      return;
    }

    const existingScenarios = await this.listAllScenarios();
    if (existingScenarios.length > 0) {
      if (hasLocalStorage) {
        localStorage.setItem(FIRST_RUN_DEMO_SCENARIOS_KEY, 'true');
      }
      return;
    }

    await this.saveProfitScenario({
      scenarioName: 'Demo Profit Scenario',
      unitPriceMinor: 2000,
      quantity: 100,
      variableCostPerUnitMinor: 1200,
      fixedCostsMinor: 30000
    });

    await this.saveBreakEvenScenario({
      scenarioName: 'Demo Break-even Scenario',
      unitPriceMinor: 2000,
      variableCostPerUnitMinor: 1200,
      fixedCostsMinor: 30000,
      targetProfitMinor: 20000,
      plannedQuantity: 120
    });

    await this.saveCashflowScenario({
      scenarioName: 'Demo Cashflow Scenario',
      startingCashMinor: 150000,
      baseMonthlyRevenueMinor: 90000,
      fixedMonthlyCostsMinor: 45000,
      variableMonthlyCostsMinor: 22000,
      forecastMonths: 6,
      monthlyGrowthRate: 0.02
    });

    if (hasLocalStorage) {
      localStorage.setItem(FIRST_RUN_DEMO_SCENARIOS_KEY, 'true');
    }
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

  public async startBillingPortalSession(userId: string, returnUrl?: string): Promise<string | null> {
    if (!this.apiClient.createBillingPortalSession) {
      return null;
    }

    const response = await this.apiClient.createBillingPortalSession({
      userId,
      returnUrl
    });

    return response.portalUrl;
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

    return this.forceRefreshEntitlements(idToken);
  }

  public async forceRefreshEntitlements(idToken: string): Promise<boolean> {
    const response = await this.apiClient.refreshEntitlements(idToken);
    this.applyEntitlementsResponse(response);
    this.lastRefreshAt = nowIso();
    return true;
  }

  public async deleteAccount(userId: string): Promise<boolean> {
    const result = await this.apiClient.deleteAccount({ userId });

    if (result.deleted) {
      this.entitlementCache = createDefaultEntitlementCache(nowIso);
      this.lastRefreshAt = null;
      saveEntitlementCache(this.entitlementCache);
    }

    return result.deleted;
  }

  public canUseVault(): boolean {
    return hasPaidEntitlement(this.entitlementCache);
  }

  public isExportWatermarked(): boolean {
    return isExportWatermarked(this.entitlementCache);
  }

  public getBusinessReportExportWatermark(): string | null {
    return getBusinessReportExportWatermark(this.entitlementCache);
  }

  public isVaultEnabled(): boolean {
    return this.vaultEnabled;
  }

  public getTelemetryConsentState(): TelemetryConsentState {
    return this.telemetryConsentState;
  }

  public setTelemetryConsentState(state: TelemetryConsentState): void {
    this.telemetryConsentState = state;

    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(TELEMETRY_CONSENT_STORAGE_KEY, state);
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

  public async canCreateScenarioForCurrentPlan(): Promise<boolean> {
    if (hasPaidEntitlement(this.entitlementCache)) {
      return true;
    }

    const scenarios = await this.scenarioRepository.listScenarios();
    return scenarios.length < FREE_PLAN_SCENARIO_LIMIT;
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
    return exportScenariosAsJson(scenarios, nowIso());
  }

  public async getBusinessReportModel(): Promise<ReportModel> {
    const scenarios = await this.scenarioRepository.listScenarios();
    return buildBusinessReportModelFromScenarios(scenarios, nowIso());
  }

  public async exportBusinessReportPdf(): Promise<Uint8Array> {
    const report = await this.getBusinessReportModel();
    const watermarkText = this.getBusinessReportExportWatermark() ?? undefined;

    return exportReportPdf(report, { watermarkText });
  }

  public async exportBusinessReportXlsx(): Promise<Uint8Array> {
    const report = await this.getBusinessReportModel();
    const watermarkText = this.getBusinessReportExportWatermark() ?? undefined;

    return exportReportXlsx(report, { watermarkText });
  }

  public async createShareSnapshotFromScenario(scenario: ScenarioV1, expiresInDays: 7 | 30 = 30): Promise<ShareCreateLocalResult> {
    if (!this.apiClient.createShareSnapshot) {
      throw new Error('Share API is not available in the current environment.');
    }

    const { encryptedSnapshot, shareKey } = await createEncryptedShareSnapshotFromScenario(scenario);

    const created = await this.apiClient.createShareSnapshot({
      encryptedSnapshot,
      expiresInDays,
      ownerUserId: this.getSignedInUserId() ?? undefined
    });

    return {
      ...created,
      shareKey
    };
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

  public async trackAppOpened(): Promise<void> {
    await this.emitTelemetryEvent('app_opened', {});
  }

  public async trackModuleOpened(moduleId: ModuleId): Promise<void> {
    await this.emitTelemetryEvent('module_opened', {
      moduleId
    });
  }

  public async trackPaywallShown(moduleId: ModuleId): Promise<void> {
    await this.emitTelemetryEvent('paywall_shown', {
      moduleId
    });
  }

  public async trackUpgradeClicked(): Promise<void> {
    await this.emitTelemetryEvent('upgrade_clicked', {});
  }

  public async trackCheckoutRedirected(): Promise<void> {
    await this.emitTelemetryEvent('checkout_redirected', {});
  }

  public async trackPurchaseConfirmed(succeeded: boolean): Promise<void> {
    await this.emitTelemetryEvent('purchase_confirmed', {
      succeeded
    });
  }

  public async trackExportClicked(format: 'pdf' | 'xlsx'): Promise<void> {
    await this.emitTelemetryEvent('export_clicked', {
      format
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
    const shareKey = this.getShareKeyFromLocation();
    return resolveSharedSnapshot(response, shareKey);
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

    if (this.telemetryConsentState !== 'enabled') {
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
    return previewImportReplaceAll(json);
  }

  public async applyImport(result: ImportReplaceAllResult): Promise<void> {
    const scenarios = getImportScenariosOrThrow(result);
    await this.scenarioRepository.replaceAllScenarios(scenarios);
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

  private applyEntitlementsResponse(response: {
    entitlements: {
      bundle: boolean;
      profit: boolean;
      breakeven: boolean;
      cashflow: boolean;
    };
    lastVerifiedAt: string;
  }): void {
    this.entitlementCache = createEntitlementCacheFromResponse(response);

    saveEntitlementCache(this.entitlementCache);
  }

  private getShareKeyFromLocation(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.location.hash.replace('#', '').trim();
    if (!raw) {
      return null;
    }

    const normalized = raw.startsWith('?') ? raw.slice(1) : raw;
    const params = new URLSearchParams(normalized);
    const fromParams = params.get('k');
    if (fromParams && fromParams.trim()) {
      return fromParams;
    }

    if (normalized.startsWith('k=')) {
      const direct = normalized.slice(2).trim();
      return direct || null;
    }

    return null;
  }
}
