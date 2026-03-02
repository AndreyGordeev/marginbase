# SMB Finance Toolkit

# Scope V1 -- Module 3: Cashflow Forecaster

------------------------------------------------------------------------

## 1. Module Goal

Provide a simple forward-looking cashflow forecast to help small
business owners identify cash shortages, runway duration, and short-term
financial stability.

------------------------------------------------------------------------

## 2. Core Inputs (V1)

### Initial State

-   Starting cash balance

### Monthly Revenue Forecast

-   Expected monthly revenue
-   Optional: revenue growth rate (%)

### Monthly Expenses

-   Fixed monthly costs
-   Variable monthly costs (single aggregated field in V1)

### Forecast Horizon

-   Forecast period (e.g., 3, 6, or 12 months)

------------------------------------------------------------------------

## 3. Core Calculations (V1)

-   Monthly projected revenue
-   Monthly projected expenses
-   Monthly net cashflow (revenue -- expenses)
-   Running cash balance over forecast period
-   Cash runway (months until cash ≤ 0)
-   Warning flag if negative balance occurs within forecast period

------------------------------------------------------------------------

## 4. Outputs & Visualization (V1)

-   Table view: month-by-month forecast summary
-   Simple line chart: cash balance over time
-   Highlighted metrics:
    -   Final balance at end of period
    -   Runway (in months)
    -   First negative month (if applicable)

------------------------------------------------------------------------

## 5. Scenario Handling (V1)

Users can create and save multiple cashflow scenarios locally.

Each scenario includes:

-   Scenario name
-   All input parameters
-   Calculated monthly projection data
-   Last updated timestamp

Scenario duplication supported for optimistic / pessimistic cases.

------------------------------------------------------------------------

## 6. UX Constraints (V1)

-   Minimal required fields to generate a forecast.
-   Immediate recalculation on input change.
-   Clear indication when projected cash becomes negative.
-   No advanced financial modeling (no taxes, no depreciation, no
    multi-stream segmentation in V1).

------------------------------------------------------------------------

## 7. Data Model (Prepared for Future Sync)

-   user_id
-   scenario_id
-   schema_version
-   input_data (JSON)
-   projection_data (JSON array of monthly values)
-   updated_at timestamp

------------------------------------------------------------------------

## 8. Out of Scope for Module 3 (V1)

-   Multi-currency forecasting
-   Tax planning and VAT modeling
-   Real-time bank integrations
-   Team collaboration
-   Automatic cloud sync

------------------------------------------------------------------------

# Calculation Engine Specification v1

## Module 3: Cashflow Forecaster

------------------------------------------------------------------------

## 0. Conventions

-   All calculations MUST use decimal arithmetic (no binary float).
-   Rounding is for display only; internal values keep full precision.
-   Forecast is discrete and month-based (integer month steps).
-   Growth rate is applied multiplicatively per month.
-   No tax, depreciation, financing, or multi-currency logic in v1.

------------------------------------------------------------------------

## 1. Inputs

### Initial State

-   starting_cash (C0)

### Revenue Assumptions

-   base_monthly_revenue (R0)
-   monthly_growth_rate (g) -- decimal form (e.g., 0.05 = 5%), default 0

### Expense Assumptions

-   fixed_monthly_costs (F)
-   variable_monthly_costs (V) -- aggregated value for v1

### Forecast Horizon

-   forecast_months (N) -- integer, N ≥ 1

------------------------------------------------------------------------

## 2. Monthly Projection Formulas

For month t, where t ∈ \[1..N\]:

### Revenue(t)

-   Revenue(t) = R0 × (1 + g)\^(t - 1)

### Expenses(t)

-   Expenses(t) = F + V

### Net Cashflow(t)

-   NetCF(t) = Revenue(t) -- Expenses(t)

### Cash Balance(t)

-   If t = 1: Cash(1) = C0 + NetCF(1)
-   If t \> 1: Cash(t) = Cash(t-1) + NetCF(t)

------------------------------------------------------------------------

## 3. Runway & Risk Metrics

### Runway (months until cash ≤ 0)

-   Smallest t such that Cash(t) ≤ 0.
-   If no such t within \[1..N\]: runway = null (display "\> N months").

### First Negative Month

-   Same t as runway.
-   If never negative within forecast: null.

### Final Balance

-   FinalBalance = Cash(N)

------------------------------------------------------------------------

## 4. Validation & Edge Cases

### Inputs validation

-   C0, R0, F, V, N must be ≥ 0 (v1).
-   g can be negative (revenue decline allowed).
-   N must be integer ≥ 1.

### Edge cases

-   If R0 = 0 and g = 0: Revenue(t) = 0 for all t.
-   If NetCF(t) = 0 for all t: Cash(t) constant.
-   If starting_cash = 0 and NetCF(1) \< 0: runway = 1.
-   Large N: ensure no precision overflow in exponentiation; use
    high-precision decimal power implementation.

------------------------------------------------------------------------

## 5. Output Contract (Fields)

-   monthly_projection\[\] array with elements:
    -   month_index (t)
    -   revenue
    -   expenses
    -   net_cashflow
    -   cash_balance
-   runway_month
-   first_negative_month
-   final_balance
-   warnings\[\] (e.g., "NEGATIVE_GROWTH", "IMMEDIATE_NEGATIVE")
