# Documentation Sync Policy

## Purpose
Keep project documentation continuously up to date so the repo reflects the real system state at any moment.

## Mandatory Rule
Any change that affects behavior, API, architecture, data, security/compliance posture, deployment, or user-visible UI must include corresponding documentation updates in the same pull request.

If code changes but docs are not updated, the work is considered incomplete.

## Source of Truth
- Primary context: `PROJECT_CONTEXT.md`
- Documentation index: `docs/INDEX.md`
- AI coding guardrails: `.github/copilot-instructions.md`

## Update Matrix (What to update)
- Product scope or capabilities:
  - `README.md`
  - `PROJECT_CONTEXT.md` (if principles/scope/status changed)
- API shape, endpoints, auth/headers, request/response contracts:
  - `docs/contracts/api.md`
- Architecture boundaries, package responsibilities, deployment topology, quality attributes:
  - `docs/architecture/*.md`
- Policy-level engineering decisions and trade-offs:
  - `docs/decisions/adr.md`
- User-visible release behavior:
  - `docs/release-notes-v1.md`
- Compliance/legal baseline changes:
  - `docs/compliance/*.md`

## .docx and .md Consistency
If `.docx` files are used (for legal/commercial handoff), maintain an equivalent authoritative `.md` file under `docs/` and update both in the same change cycle.

Recommended convention:
- `docs/<area>/<name>.md` is the engineering source of truth in-repo
- matching `.docx` is treated as distribution/export artifact

## Pull Request Checklist (Required)
- [ ] I reviewed which documentation files are affected by this change.
- [ ] I updated all relevant `.md` files in this PR.
- [ ] If `.docx` exists for affected material, I updated it too (or documented why not).
- [ ] `docs/INDEX.md` still points to the correct docs.
- [ ] Product/architecture/API statements are consistent across `README.md`, `PROJECT_CONTEXT.md`, and domain docs.

## Enforcement Guidance
- Reject PRs that modify implementation without corresponding documentation updates when docs are impacted.
- Prefer small, frequent doc updates over delayed bulk documentation.
- Keep statements specific and verifiable; avoid stale TODO placeholders in architecture/contract docs.
