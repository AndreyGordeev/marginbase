# SMB Finance Toolkit

# Scope V1 -- Module 2: Break-even Calculator

------------------------------------------------------------------------

## 1. Module Goal

Provide a clear and practical way for small business owners to determine
the break-even point in units and revenue for a given pricing and cost
structure.

------------------------------------------------------------------------

## 2. Core Inputs (V1)

### Pricing & Cost Inputs

-   Unit price
-   Variable cost per unit
-   Total fixed costs (for selected period)

### Optional (V1 -- minimal)

-   Target profit (to calculate required sales volume)

------------------------------------------------------------------------

## 3. Core Calculations (V1)

-   Contribution per unit (Unit price -- Variable cost per unit)
-   Break-even quantity (Fixed costs / Contribution per unit)
-   Break-even revenue (Break-even quantity × Unit price)
-   Margin of safety (if actual or planned quantity is provided)
-   Required quantity for target profit (if target profit entered)

------------------------------------------------------------------------

## 4. Outputs & Visualization (V1)

-   Clear numeric summary panel with:
    -   Break-even quantity
    -   Break-even revenue
    -   Contribution per unit
-   Simple visual representation: cost vs revenue line chart (minimal
    version).
-   Highlighted warning if contribution per unit ≤ 0 (no break-even
    possible).

------------------------------------------------------------------------

## 5. Scenario Handling (V1)

Users can create and save multiple break-even scenarios locally.

Each scenario includes:

-   Scenario name
-   All input parameters
-   Auto-calculated outputs
-   Last updated timestamp

Scenario duplication supported (recommended for testing price
variations).

------------------------------------------------------------------------

## 6. UX Constraints (V1)

-   Minimal required inputs.
-   Immediate recalculation on input change.
-   Clear inline explanations for break-even concept.
-   Validation for division by zero and negative contribution cases.

------------------------------------------------------------------------

## 7. Data Model (Prepared for Future Sync)

-   user_id
-   scenario_id
-   schema_version
-   input_data (JSON)
-   calculated_data (optional or recomputed on load)
-   updated_at timestamp

------------------------------------------------------------------------

## 8. Out of Scope for Module 2 (V1)

-   Multi-product blended break-even analysis
-   Dynamic cost curves or advanced financial modeling
-   Tax-adjusted break-even
-   Real-time cloud sync or collaboration

------------------------------------------------------------------------

# Calculation Engine Specification v1

## Module 2: Break-even Calculator

------------------------------------------------------------------------

## 0. Conventions

-   All calculations MUST use decimal arithmetic (no binary float).
-   Rounding is for display only; internal values keep full precision.
-   Percent values are expressed as a fraction × 100 for display.
-   Inputs must be consistent within the scenario period.
-   Break-even is computed on unit economics (single product/service).

------------------------------------------------------------------------

## 1. Inputs

### Required

-   unit_price (P)
-   variable_cost_per_unit (V)
-   fixed_costs_total (F)

### Optional (v1 minimal)

-   target_profit (TP) -- default 0
-   planned_quantity (Qp) -- optional, used for margin of safety
-   planned_revenue (Rp) -- optional alternative to Qp (if provided, Qp
    = Rp / P when P \> 0)

------------------------------------------------------------------------

## 2. Derived Base Values

### Unit contribution (UC)

-   UC = P -- V

------------------------------------------------------------------------

## 3. Break-even Formulas

### Break-even quantity (BEQ)

-   If UC \> 0: BEQ = F / UC
-   Else: BEQ = null → warning "UC_NON_POSITIVE"

### Break-even revenue (BER)

-   If BEQ is defined: BER = BEQ × P
-   Else: BER = null

------------------------------------------------------------------------

## 4. Target Profit Formulas (Optional)

### Required quantity for target profit (RQTP)

-   If UC \> 0: RQTP = (F + TP) / UC
-   Else: RQTP = null → warning "UC_NON_POSITIVE"

### Required revenue for target profit (RRTP)

-   If RQTP is defined: RRTP = RQTP × P
-   Else: RRTP = null

------------------------------------------------------------------------

## 5. Margin of Safety (Optional)

### Planned quantity (Qp) resolution

-   If Qp provided: use as-is.
-   Else if planned_revenue (Rp) provided and P \> 0: Qp = Rp / P
-   Else: Qp = null

### Margin of safety (units) (MOSu)

-   If Qp and BEQ defined: MOSu = Qp -- BEQ
-   Else: MOSu = null

### Margin of safety % (MOS%)

-   If Qp defined and Qp \> 0 and BEQ defined: MOS% = (MOSu / Qp)
-   Else: MOS% = null → display "N/A"

------------------------------------------------------------------------

## 6. Validation & Edge Cases

### Inputs validation

-   P, V, F, TP, Qp, Rp must be ≥ 0 (v1).
-   If P = 0: UC = -V; break-even undefined unless V = 0 and F = 0
    (special case).

### Edge cases and warnings

-   If UC ≤ 0: no break-even → BEQ/BER/RQTP/RRTP = null; warning
    "UC_NON_POSITIVE".
-   If F = 0 and UC \> 0: BEQ = 0; BER = 0.
-   If planned_revenue provided with P = 0: cannot derive Qp; warning
    "P_ZERO_PLANNED_REVENUE".
-   Negative MOSu allowed (means plan below break-even).

------------------------------------------------------------------------

## 7. Output Contract (Fields)

-   unit_contribution (UC)
-   break_even_quantity (BEQ)
-   break_even_revenue (BER)
-   required_quantity_target_profit (RQTP)
-   required_revenue_target_profit (RRTP)
-   planned_quantity (Qp_resolved)
-   margin_of_safety_units (MOSu)
-   margin_of_safety_pct (MOS%)
-   warnings\[\] (e.g., "UC_NON_POSITIVE", "P_ZERO_PLANNED_REVENUE")
