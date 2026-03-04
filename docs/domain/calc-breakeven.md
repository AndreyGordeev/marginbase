# Break-even — Calculation Spec (v1)

Status: aligned with `packages/domain-core/src/breakeven.ts` and tests.

## Inputs
- Required:
	- `unitPriceMinor`
	- `variableCostPerUnitMinor`
	- `fixedCostsMinor`
- Optional:
	- `targetProfitMinor` (default `0`)
	- `plannedQuantity`
	- `plannedRevenueMinor`

Input constraints:
- monetary fields are non-negative safe integers (minor units)
- `plannedQuantity`, when used, must be non-negative

## Outputs
- `unitContributionMinor`
- `breakEvenQuantity | null`
- `breakEvenRevenueMinor | null`
- `requiredQuantityForTargetProfit | null`
- `requiredRevenueForTargetProfitMinor | null`
- `plannedQuantityResolved | null`
- `marginOfSafetyUnits | null`
- `marginOfSafetyPct | null`
- `warnings: BreakEvenWarning[]`

## Formula Rules
- `unitContributionMinor = unitPriceMinor - variableCostPerUnitMinor`
- If `unitContributionMinor > 0`:
	- `breakEvenQuantity = fixedCostsMinor / unitContributionMinor`
	- `breakEvenRevenueMinor = breakEvenQuantity * unitPriceMinor`
	- `requiredQuantityForTargetProfit = (fixedCostsMinor + targetProfitMinor) / unitContributionMinor`
	- `requiredRevenueForTargetProfitMinor = requiredQuantityForTargetProfit * unitPriceMinor`
- If `unitContributionMinor <= 0`:
	- all four values above are `null`
	- warning `UC_NON_POSITIVE` is emitted.
- `plannedQuantityResolved`:
	- use `plannedQuantity` when provided,
	- else derive as `plannedRevenueMinor / unitPriceMinor` when `plannedRevenueMinor` is provided and `unitPriceMinor > 0`,
	- else `null` (with warning `P_ZERO_PLANNED_REVENUE` when price is zero and planned revenue exists).
- `marginOfSafetyUnits = plannedQuantityResolved - breakEvenQuantity` when both exist, else `null`.
- `marginOfSafetyPct = marginOfSafetyUnits / plannedQuantityResolved` when planned quantity `> 0`, else `null`.

## Edge Cases
- Zero or negative unit contribution disables break-even and target-profit outputs (`null`).
- Planned revenue with zero price cannot resolve quantity (`P_ZERO_PLANNED_REVENUE`).
- Decimal outputs keep full precision.

## Test References
- Unit behavior: `packages/domain-core/tests/breakeven.test.ts`
- Stable vectors: `packages/domain-core/tests/golden-vectors.integration.test.ts`
