# SMB Finance Toolkit

# Scope V1 -- Module 1: Profit / Margin Calculator

------------------------------------------------------------------------

## 1. Module Goal

Provide a fast and clear way for small business owners to calculate
profitability, margin, markup, and contribution metrics for a product or
service scenario.

------------------------------------------------------------------------

## 2. Core Inputs (V1)

### Revenue Inputs

-   Unit price
-   Quantity sold (optional if total revenue is entered directly)
-   OR direct total revenue input

### Cost Inputs

-   Variable cost per unit
-   Fixed costs (total for selected period)
-   Optional: additional variable costs (aggregated field in V1)

------------------------------------------------------------------------

## 3. Core Calculations (V1)

-   Total revenue
-   Total variable cost
-   Total cost (variable + fixed)
-   Gross profit
-   Contribution margin
-   Contribution margin %
-   Net profit (after fixed costs)
-   Net profit %
-   Markup %

------------------------------------------------------------------------

## 4. Outputs & Visualization (V1)

-   Clear numeric summary panel
-   Highlighted key metrics: Net Profit, Net Profit %, Contribution
    Margin %
-   Simple visual breakdown (e.g., cost vs profit bar representation)
-   No advanced charts in V1

------------------------------------------------------------------------

## 5. Scenario Handling (V1)

Users can create and save multiple scenarios locally.

Each scenario has:

-   Scenario name
-   All input parameters
-   Auto-calculated outputs
-   Last updated timestamp

Scenario duplication supported (optional but recommended for V1).

------------------------------------------------------------------------

## 6. UX Constraints (V1)

-   Fast data entry, minimal required fields.
-   Immediate recalculation on input change.
-   No complex multi-step wizard.
-   Clear explanation tooltips for margin vs markup.

------------------------------------------------------------------------

## 7. Data Model (Prepared for Future Sync)

-   user_id
-   scenario_id
-   schema_version
-   input_data (JSON)
-   calculated_data (JSON, optional or recomputed on load)
-   updated_at timestamp

------------------------------------------------------------------------

## 8. Out of Scope for Module 1 (V1)

-   Multi-product portfolio modeling
-   Historical trend tracking over time
-   Tax modeling
-   Multi-currency conversion logic
-   Cloud-based sharing or collaboration

------------------------------------------------------------------------

# Calculation Engine Specification v1

## Module 1: Profit / Margin Calculator

------------------------------------------------------------------------

## 0. Conventions

-   All calculations MUST use decimal arithmetic (no binary float).
-   Rounding is for display only; internal values keep full precision.
-   Percent values are expressed as a fraction × 100 for display (e.g.,
    0.25 → 25%).
-   Currency is treated as a numeric amount; currency conversion is out
    of scope for v1.
-   Period for fixed costs is user-selected (e.g., monthly). Inputs must
    be consistent within the scenario.

------------------------------------------------------------------------

## 1. Inputs

Required (choose one revenue mode):

### A) Unit mode

-   unit_price (P)
-   quantity (Q)

### B) Total revenue mode

-   total_revenue (R)

### Costs

-   variable_cost_per_unit (V)
-   fixed_costs_total (F)
-   additional_variable_costs_total (A) -- optional, default 0

------------------------------------------------------------------------

## 2. Derived Base Values

### Revenue (R)

-   If Unit mode: R = P × Q
-   If Total revenue mode: R = total_revenue input

### Total variable cost (TVC)

-   If Unit mode: TVC = V × Q + A
-   If Total revenue mode: TVC = (V × Q) + A is NOT available unless Q
    provided; in v1 Total revenue mode requires Q if V is used.

Practical rule for v1:\
Total revenue mode still captures Q if user wants per-unit variable
cost; otherwise user enters TVC directly as A + TVC_total.

### Total cost (TC)

-   TC = TVC + F

------------------------------------------------------------------------

## 3. Profit Metrics

### Gross profit (GP)

-   GP = R -- TVC

### Net profit (NP)

-   NP = R -- TVC -- F\
-   Equivalent: NP = GP -- F

------------------------------------------------------------------------

## 4. Margin, Contribution, Markup

### Contribution margin (CM)

-   CM = R -- TVC

### Contribution margin % (CM%)

-   If R \> 0: CM% = (CM / R)
-   Else: CM% = null → display "N/A"

### Net profit % (NP%)

-   If R \> 0: NP% = (NP / R)
-   Else: NP% = null → display "N/A"

### Markup % (MU%)

Definition: markup relative to variable cost only (unit economics).

-   Unit contribution (UC) = P -- V
-   If V \> 0: MU% = (UC / V)
-   Else: MU% = null → display "N/A"

------------------------------------------------------------------------

## 5. Validation & Edge Cases

### Inputs validation

-   P, Q, R, V, F, A must be ≥ 0 (v1).
-   If Unit mode: require P and Q.
-   If Total revenue mode: require R.
-   If Total revenue mode AND V is provided: require Q OR provide a
    TVC_total override; otherwise cannot compute TVC.

### Edge cases

-   If R = 0: CM%, NP% = null (N/A).
-   If V = 0: MU% = null (N/A).
-   If CM \< 0 or NP \< 0: allowed; display negative profit normally.
-   Very large numbers: use high-precision decimal library to avoid
    overflow.

------------------------------------------------------------------------

## 6. Output Contract (Fields)

-   revenue_total (R)
-   variable_cost_total (TVC)
-   fixed_cost_total (F)
-   total_cost (TC)
-   gross_profit (GP)
-   net_profit (NP)
-   contribution_margin (CM)
-   contribution_margin_pct (CM%)
-   net_profit_pct (NP%)
-   markup_pct (MU%)
-   warnings\[\] (e.g., "R_ZERO", "V_ZERO", "INSUFFICIENT_DATA_TVC")
