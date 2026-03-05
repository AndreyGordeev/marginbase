# Git Hooks Setup

This directory contains Git hooks that help maintain code quality by running checks before commits.

## Installation

Run once after cloning:

```bash
# Option 1: Automatic (recommended)
corepack pnpm run hooks:install

# Option 2: Manual
git config core.hooksPath .githooks
```

## Hooks

### pre-commit
Runs before every commit:
- ✅ Checks for `console.log` in production code
- ✅ Runs ESLint
- ✅ Runs TypeScript type checking
- ✅ Validates i18n key parity across locales

If any check fails, the commit is blocked.

## Bypassing (Emergency Only)

```bash
# Skip hooks for urgent hotfix
git commit --no-verify -m "hotfix: critical bug"
```

**⚠️ Warning**: Never bypass hooks for normal development. Always fix the issues instead.

## Troubleshooting

### Hook not running
```bash
# Verify hooks path
git config --get core.hooksPath
# Should output: .githooks

# Re-install
corepack pnpm run hooks:install
```

### Hook fails but code is correct
```bash
# Run checks manually to see detailed output
corepack pnpm run check:console-logs
corepack pnpm run lint
corepack pnpm run typecheck
corepack pnpm run i18n:parity
```

### Permission denied (Unix)
```bash
chmod +x .githooks/pre-commit
```
