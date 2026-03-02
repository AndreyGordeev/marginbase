export interface ScenarioRepository {
  listScenarioIds(): Promise<string[]>;
}
