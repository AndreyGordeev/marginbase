import {
  SqlitePlaceholderConnection,
  SqlitePlaceholderScenarioRepository,
  type ScenarioRepository,
  type SqlitePlaceholderScenario
} from '@marginbase/storage';
import { WebAppService } from '../../src/web-app-service';

export const createRepository = (): ScenarioRepository<SqlitePlaceholderScenario> => {
  return new SqlitePlaceholderScenarioRepository(new SqlitePlaceholderConnection());
};

export const createLocalStorageMock = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    key(index: number): string | null {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    }
  };
};

export const installLocalStorage = (): Storage => {
  const mock = createLocalStorageMock();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: mock
  });

  return mock;
};

export const createService = (
  apiClientOverrides: Partial<NonNullable<ConstructorParameters<typeof WebAppService>[1]>> = {}
): WebAppService => {
  return new WebAppService(createRepository(), {
    refreshEntitlements: async () => {
      throw new Error('not used');
    },
    deleteAccount: async () => {
      throw new Error('not used');
    },
    ...apiClientOverrides
  });
};
