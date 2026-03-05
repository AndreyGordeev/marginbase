# Contributing to MarginBase

Thank you for your interest in contributing to MarginBase! This document provides guidelines and instructions for contributing to the project.

## Development Setup

1. **Prerequisites**
   - Node.js 20+ with corepack enabled
   - Git
   - VS Code (recommended)

2. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd marginbase
   corepack pnpm install
   ```

3. **Verify Setup**
   ```bash
   corepack pnpm validate:all
   corepack pnpm test:e2e:all
   ```

## Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

Follow the architecture guardrails:
- **Formulas** → `packages/domain-core` (pure functions only)
- **Persistence** → `packages/storage` (repository interfaces)
- **Entitlements** → `packages/entitlements` (policy + gating)
- **Telemetry** → `packages/telemetry` (queue + allowlist)
- **API calls** → `packages/api-client` (typed, minimal endpoints)

### 3. Write Tests

Every change should include tests:
- **Unit tests** for business logic (Vitest)
- **Property-based tests** for numeric invariants (fast-check)
- **Integration tests** for cross-package interactions
- **E2E tests** for critical user flows (Playwright)

### 4. Run Quality Checks

```bash
# Before committing
corepack pnpm validate:all

# Before pushing
corepack pnpm test:e2e:all
```

### 5. Commit

Use conventional commits:
```bash
git commit -m "feat(domain-core): add compound interest calculation"
git commit -m "fix(web): resolve race condition in vault initialization"
git commit -m "docs(architecture): document retry policy"
git commit -m "test(storage): add migration rollback test"
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`

### 6. Update Documentation

If your change affects:
- **Public API** → Update `docs/contracts/api.md`
- **Architecture** → Update relevant file in `docs/architecture/`
- **User-facing behavior** → Update `docs/release-notes-v1.md`
- **Testing approach** → Update `testing_strategy_master.md`

See [docs/documentation-sync-policy.md](docs/documentation-sync-policy.md) for sync rules.

### 7. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Code Style

### TypeScript
- Use `const` by default, `let` when reassignment needed
- Prefer named exports over default exports
- Use explicit return types for public APIs
- Keep functions pure in `domain-core`

### Testing
- Use descriptive test names: `"returns false when entitlement expired"`
- Use `data-testid` for E2E-tested elements
- Mock time using `nowProvider` injection
- Aim for >90% coverage in critical packages

### Naming
- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

## Quality Standards

### Must Pass
- ✅ `corepack pnpm lint` (zero ESLint errors)
- ✅ `corepack pnpm typecheck` (zero TypeScript errors)
- ✅ `corepack pnpm i18n:parity` (all locales have matching keys)
- ✅ `corepack pnpm test` (all unit/integration tests pass)
- ✅ `corepack pnpm test:coverage` (>90% coverage in critical packages)
- ✅ `corepack pnpm test:e2e` (all E2E tests pass on 3 browsers)
- ✅ `corepack pnpm check:console-logs` (no console.log in production)
- ✅ `corepack pnpm check:bundle-size` (web dist < 10MB)

### CI Pipeline
GitHub Actions will run all checks automatically. PRs must pass:
- lint_typecheck job
- build job (with bundle size check)
- tests job (with coverage gates)
- e2e job (Chromium + Firefox + WebKit)

## Privacy & Security Rules

### 🚫 Never Log/Store
- User email addresses
- Stripe customer IDs
- Payment receipts
- Raw financial scenario values
- Decryption keys for shared scenarios

### ✅ Allowed in Telemetry
- User ID (hashed)
- Event names from allowlist
- Non-financial metadata (e.g., locale, theme)
- Performance timings

See [docs/architecture/telemetry-allowlist.md](docs/architecture/telemetry-allowlist.md) for complete policy.

## Common Tasks

### Add a New Calculator
1. Define formula in `packages/domain-core/src/calculators/`
2. Add property-based tests for invariants
3. Create UI in `apps/web/src/pages/`
4. Add E2E test in `apps/web/tests/e2e/`
5. Update router in `apps/web/src/router.tsx`
6. Add localization keys to all 7 locales

### Add a New Locale
1. Copy `apps/web/src/locales/en.json` → `apps/web/src/locales/xx.json`
2. Translate all keys (use DeepL/ChatGPT for initial pass)
3. Add to `SUPPORTED_LANGUAGES` in `apps/web/src/config.ts`
4. Add to routing in `apps/web/src/router.tsx`
5. Run `corepack pnpm i18n:parity` to verify
6. Add E2E smoke test for new locale

### Fix a Failing Test
1. Read test output carefully (test name, assertion, expected vs actual)
2. Check if time mocking is needed (`nowProvider` injection)
3. For E2E: use `--ui` mode to debug interactively
4. For unit: use `--watch` mode with focused test
5. Update snapshots only if visual change is intentional

### Debug E2E Failure
```bash
# Run single test with UI
corepack pnpm exec playwright test share-link.spec.ts --ui

# Generate trace
corepack pnpm exec playwright test --trace on

# View trace
corepack pnpm exec playwright show-report
```

## Getting Help

- Read [DEVELOPMENT.md](DEVELOPMENT.md) for complete developer guide
- Check [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for project overview
- Review [docs/architecture/overview.md](docs/architecture/overview.md) for architecture
- Look at existing tests for examples

## Pull Request Checklist

Before requesting review:
- [ ] All quality checks pass locally
- [ ] Tests added for new functionality
- [ ] Tests updated for changed functionality
- [ ] Documentation updated (if contracts/architecture/UI changed)
- [ ] Commit messages follow conventional commits
- [ ] No `console.log` in production code
- [ ] No secrets/tokens in code or commit history
- [ ] Privacy rules followed (no financial values in telemetry)

## License

By contributing, you agree that your contributions will be licensed under the project's proprietary license.
