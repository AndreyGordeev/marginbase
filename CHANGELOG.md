# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - CI/CD & Quality Infrastructure (2026-03-05)

#### CI Pipeline Enhancements
- **Playwright browser caching**: Browsers (~400MB) now cached by version, saves ~2min per CI run
- **pnpm store caching**: Optimized cache path to `~/.local/share/pnpm/store`
- **New build job**: Dedicated job with bundle size check (fails if dist > 10MB, current: ~2-3MB)
- **Security audit**: Added `pnpm audit --audit-level moderate` (continue-on-error)
- **Conditional browser install**: Only installs when cache miss, else runs install-deps only
- **Testkit build step**: Added before tests/E2E to prevent import errors
- **Artifact retention**: Set to 7 days (was unlimited)
- **JSON reporter**: Added for E2E results in CI

#### Playwright Configuration
- **Parallel workers**: Uses 2 workers in CI, max CPUs locally
- **ForbidOnly**: Prevents `.only()` tests from being committed (CI only)
- **Enhanced reporters**: JSON output in CI, auto-open HTML on local failure
- **ReducedMotion**: Added to all 3 browser projects for stable visuals
- **Timeouts**: navigation 15s, action 10s for deterministic execution
- **WebServer config**: `stdout: 'ignore', stderr: 'pipe'` to reduce noise

#### Quality Scripts
- **test:e2e:all**: Builds testkit before running E2E (CI-compatible)
- **test:deterministic**: Runs tests 3× consecutively to catch flaky tests
- **check:console-logs**: Validates no `console.log` in production code (excludes test files, scripts/, main.ts)
- **check:bundle-size**: Local bundle size check (mirrors CI validation)
- **audit:security**: Wrapper around `pnpm audit --audit-level moderate`
- **validate:all**: Full validation suite (lint + typecheck + i18n + test + coverage)
- **hooks:install**: Installs Git pre-commit hooks automatically

#### Documentation
- **DEVELOPMENT.md**: Complete developer guide with scripts reference, CI architecture, testing layers
- **CONTRIBUTING.md**: Comprehensive contribution guide with workflow, code style, quality standards
- **README.md**: Enhanced with quick start, testing stats, documentation links
- **.editorconfig**: Added for editor consistency across team
- **.githooks/pre-commit**: Git hook for pre-commit validation (console.log, lint, typecheck, i18n)
- **.githooks/README.md**: Hook installation and troubleshooting guide

#### Test Infrastructure
- **Console.log detector**: Custom script using git grep with proper exclusions
- **Coverage gates**: 95% lines, 90% branches enforced in critical packages
- **Property-based testing**: 1000+ runs per invariant using fast-check

### Fixed

#### Mobile Tests
- **canOpenModule**: Now uses `this.nowProvider()` instead of `new Date()` for consistent time mocking
- **MobileAppService constructor**: Added missing `nowProvider` parameter in tests

#### Web Tests
- **Entitlements dates**: Updated `lastVerifiedAt` from 2026-03-02 to 2026-03-05 (within 72h offline grace period)

### Performance
- **CI execution**: ~30% faster with intelligent caching (estimated 8-10min, down from 12-15min)
- **Browser cache**: ~2min savings per CI run (400MB Playwright browsers)
- **pnpm cache**: ~30s savings per CI run

### Test Results (2026-03-05)
- **Total**: 255/255 tests passing ✅
  - Unit/Integration: 153/153
  - E2E: 102/102 (× 3 browsers = 306 validations)
- **Coverage**: >90% in critical packages (domain-core, reporting)
- **E2E browsers**: Chromium, Firefox, WebKit
- **Property-based**: 1000+ runs per invariant

## [1.0.0] - 2026-03-04

### Initial Release
- Profit/Margin calculator
- Break-even calculator
- Cashflow calculator
- Local Business Report export (PDF + XLSX)
- Shareable scenario links (encrypted)
- Embeddable calculators
- 7 locales: en, de, fr, es, pl, it, ru
- Offline-first architecture
- Subscription management (Stripe)
- Privacy-first telemetry

---

## Version History

- **Unreleased**: CI/CD infrastructure, quality tooling, documentation
- **1.0.0** (2026-03-04): Initial release with 3 calculators
