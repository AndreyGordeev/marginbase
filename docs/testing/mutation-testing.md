# Mutation Testing Configuration

## Scope

Mutation testing is enabled with Stryker for:

- `packages/domain-core`
- `packages/entitlements`
- `packages/backend-server`

## Thresholds

- Global package thresholds: `threshold=65`, `thresholdFatal=50`
- CI fails if a package score is below threshold.

## Exclusions

Exclusions are intentionally minimal and documented per package config:

- `src/index.ts`: barrel export files with little mutation signal.
- `backend-server/src/server.ts`: runtime composition/bootstrapping entrypoint.
- `backend-server/src/adapters/**/*.ts`: thin transport adapters with low mutation value compared to service-level tests.

## CI

Mutation tests are enforced by `.github/workflows/mutation.yml` and executed on PRs and `main`.

## Commands

- Run all: `corepack pnpm test:mutation`
- Per package:
  - `corepack pnpm --filter @marginbase/domain-core run test:mutation`
  - `corepack pnpm --filter @marginbase/entitlements run test:mutation`
  - `corepack pnpm --filter @marginbase/backend-server run test:mutation`
