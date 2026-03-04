# Cashflow Forecast — Calculation Spec (v1)

Status: aligned with `packages/domain-core/src/cashflow.ts` and tests.

## Inputs
- Required:
	- `openingBalanceMinor`
	- `inflowsMinor[]`
	- `outflowsMinor[]`
- Optional:
	- `labels[]` (aligned by index)

Input constraints:
- `openingBalanceMinor` must be a non-negative safe integer
- `inflowsMinor` and `outflowsMinor` must be non-empty arrays of non-negative safe integers and have equal length
- `labels`, when provided, must have the same length as flows

## Outputs
- `periods[]`, where each period includes:
	- `index`
	- `label`
	- `openingMinor`
	- `inflowMinor`
	- `outflowMinor`
	- `netMinor`
	- `closingMinor`
- `summary`:
	- `totalInflowsMinor`
	- `totalOutflowsMinor`
	- `netChangeMinor`
	- `endingBalanceMinor`
	- `minimumBalanceMinor`
	- `runwayPeriodIndex`
- `warnings: CashflowWarning[]`

## Formula Rules
- For each period `i`:
	- `opening = openingBalanceMinor` for `i = 0`, otherwise previous `closing`
	- `netMinor = inflowMinor - outflowMinor`
	- `closingMinor = openingMinor + netMinor`
- Summary:
	- totals are sums across periods
	- `netChangeMinor = totalInflowsMinor - totalOutflowsMinor`
	- `endingBalanceMinor = final period closing`
	- `minimumBalanceMinor = min(openingBalanceMinor, each period closing)`
- `runwayPeriodIndex`:
	- index of the first period where `closingMinor < 0`, else `null`

Warnings emitted:
- `NEGATIVE_ENDING_BALANCE` when ending balance is below zero
- `RUNWAY_EXHAUSTED` when any period closes below zero
- `DECLINING_TREND` when `inflowMinor < outflowMinor` in a strict majority of periods

## Edge Cases
- Equal inflow/outflow in all periods keeps balances flat (no trend warning).
- Single-period projection is valid.
- Labels default to `Period {n}` when omitted.

## Test References
- Unit behavior: `packages/domain-core/tests/cashflow.test.ts`
- Stable vectors: `packages/domain-core/tests/golden-vectors.integration.test.ts`
