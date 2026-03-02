# Numeric Policy (v1)

Purpose: define a single, strict numeric strategy for all clients and `domain-core`.

## Rules
- Money is stored as **minor units** (e.g., cents) in integer form.
- Never use floating point for money arithmetic.
- Ratios/percentages may use a decimal library, but outputs must be rounded explicitly.
- Rounding policy must be centralized and unit-tested.

## Notes for Copilot
- Implement helpers: parse/display, add/subtract/multiply/divide money safely.
- Add golden test vectors for rounding boundaries.
