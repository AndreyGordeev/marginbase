# Profit / Margin — Calculation Spec (v1)

Status: aligned with `packages/domain-core/src/profit.ts` and tests.

## Inputs
- `mode: 'unit' | 'revenue'`
- Common:
	- `fixedCostsMinor` (non-negative safe integer)
	- `additionalVariableCostsMinor?` (non-negative safe integer, default `0`)
- `unit` mode:
	- `unitPriceMinor`, `quantity`, `variableCostPerUnitMinor`
- `revenue` mode:
	- `totalRevenueMinor`
	- optional `totalVariableCostsMinor`
	- or optional pair `variableCostPerUnitMinor` + `quantity`

## Outputs
- `revenueTotalMinor`
- `variableCostTotalMinor`
- `fixedCostTotalMinor`
- `totalCostMinor`
- `grossProfitMinor`
- `netProfitMinor`
- `contributionMarginMinor`
- `contributionMarginPct | null`
- `netProfitPct | null`
- `markupPct | null`
- `warnings: ProfitWarning[]`

## Formula Rules
- `revenueTotalMinor`:
	- `unit`: `unitPriceMinor * quantity`
	- `revenue`: `totalRevenueMinor`
- `variableCostTotalMinor`:
	- `unit`: `(variableCostPerUnitMinor * quantity) + additionalVariableCostsMinor`
	- `revenue`:
		- use `totalVariableCostsMinor` when provided;
		- else use `(variableCostPerUnitMinor * quantity) + additionalVariableCostsMinor` when both fields exist;
		- else fallback to `additionalVariableCostsMinor` and emit warning `INSUFFICIENT_DATA_TVC`.
- `grossProfitMinor = revenueTotalMinor - variableCostTotalMinor`
- `netProfitMinor = grossProfitMinor - fixedCostsMinor`
- `totalCostMinor = variableCostTotalMinor + fixedCostsMinor`
- `contributionMarginMinor = grossProfitMinor`
- `contributionMarginPct = contributionMarginMinor / revenueTotalMinor` when revenue `> 0`, else `null`.
- `netProfitPct = netProfitMinor / revenueTotalMinor` when revenue `> 0`, else `null`.
- `markupPct = netProfitMinor / totalCostMinor` when total cost `> 0`, else `null`.

## Edge Cases
- `R_ZERO`: emitted when `revenueTotalMinor <= 0`.
- `V_ZERO`: emitted when `totalCostMinor <= 0` (markup unavailable).
- `INSUFFICIENT_DATA_TVC`: emitted in `revenue` mode when TVC cannot be fully resolved.
- All money/integer-like inputs are validated as non-negative safe integers.
- Decimal outputs are returned with full precision (no display rounding at calculation layer).

## Test References
- Unit behavior: `packages/domain-core/tests/profit.test.ts`
- Stable vectors: `packages/domain-core/tests/golden-vectors.integration.test.ts`
