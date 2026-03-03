import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const showDebugResults = mode === 'development' || process.env.VITE_SHOW_DEBUG_RESULTS === 'true';

  return {
    define: {
      __MB_SHOW_DEBUG_RESULTS__: JSON.stringify(showDebugResults)
    },
    resolve: {
      alias: {
        '@marginbase/api-client': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
        '@marginbase/domain-core': path.resolve(__dirname, '../../packages/domain-core/src/index.ts'),
        '@marginbase/entitlements': path.resolve(__dirname, '../../packages/entitlements/src/index.ts'),
        '@marginbase/storage': path.resolve(__dirname, '../../packages/storage/src/index.ts'),
        '@marginbase/telemetry': path.resolve(__dirname, '../../packages/telemetry/src/index.ts')
      }
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/, /packages[\\/][^\\/]+[\\/]dist/]
      }
    }
  };
});
