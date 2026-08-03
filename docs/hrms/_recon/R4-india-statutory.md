# R4 — India Statutory Rule Set: Research Bibliography

> **[UNVERIFIED — requires sign-off by a qualified Indian CA/payroll professional before go-live]**
>
> This document is a research compilation for professional review. It is NOT tax or legal advice. Every rate, slab, ceiling, and threshold must be independently verified against official primary sources before being used in production payroll. Secondary sources are labelled; primary sources are preferred but not always accessible for every parameter.
>
> Today's date: 2026-07-31. Current Indian FY: FY2026-27 (AY2027-28).
> Both FY2025-26 (AY2026-27) and FY2026-27 (AY2027-28) are reported where they differ.

---

## 1. EPF / Provident Fund

> **[UNVERIFIED — requires CA/payroll professional sign-off]**

| Parameter | Value | Effective from | Source URL | Source type | Our code has (file:line) | Discrepancy? |
|---|---|---|---|---|---|---|
| Employee contribution rate | 12% of Basic+DA | Since inception; unchanged | https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/ContributionRate.pdf | Primary (attempted; PDF binary) | `"12"` — statutory-registry.ts:107 / statutory-packs.ts:41 | None |
| Employer contribution rate (total) | 12% of Basic+DA | Since inception | Same as above | Primary | `"12"` — statutory-registry.ts:108 / statutory-packs.ts:49 | None |
| PF monthly wage ceiling (statutory) | ₹15,000 | Sep 2014 (unchanged in FY2026-27) | https://www.epfindia.gov.in / https://taxfetchindia.com/blog/taxation-time/epfo-wage-ceiling-delay-2026-pf-contribution | Primary / Secondary | `"15000.00"` — statutory-registry.ts:109 | None — proposed ₹21,000 hike delayed |
| Employer split — EPS portion | 8.33% of Basic+DA, **capped at ₹1,250/mo** (i.e. on max ₹15,000 base) | Since inception | https://www.bajajfinserv.in/investments/pf-contribution-breakup | Secondary | **NOT MODELLED** — employer shown as flat "12% up to ₹15,000" with no EPS/EPF split | **GAP**: No EPS vs EPF split. Passbook/pension reporting is incorrect without it. |
| Employer split — EPF portion (balance) | 3.67% of actual Basic+DA (employer full 12% minus EPS ₹1,250 where base > ₹15,000) | Since inception | Same | Secondary | NOT MODELLED | Same gap |
| EDLI (Employees' Deposit-Linked Insurance) | 0.50% of Basic+DA, **max ₹75/employee/month** | Notified via MoLE; stable | https://ezhrm.in/pf-esi-calculation-india-2026-rates-formula-hr-guide/ | Secondary | **NOT MODELLED** — no EDLI component | **GAP**: Employer cost line missing |
| EPF Admin Charges | 0.50% of Basic+DA, **minimum ₹500/establishment/month** | Current | Same | Secondary | **NOT MODELLED** | **GAP**: Employer cost line missing |
| Smaller establishment rate (< 20 employees or sick units) | 10% (both employee & employer) | Ongoing | https://www.epfindia.gov.in/site_en/FAQ.php | Primary | NOT MODELLED | GAP: No alternate-rate path |
| New EPF Scheme 2026 effective date | June 29, 2026 (aligns PF with Code on Social Security, 2020; removes ambiguity on ceiling cap) | 2026-06-29 | https://hrinformative.com/epf-new-rules-2026-complete-guide/ | Secondary | N/A | No code change needed for ceiling; EPS split gap remains |
| Voluntary PF (VPF) | Employee may contribute above 12%; employer may cap own share at statutory 12% | Ongoing | https://www.epfindia.gov.in | Primary | NOT MODELLED | GAP: No VPF component |
| International worker rules | Higher rate on higher ceiling (no ₹15,000 cap) — governed by Social Security Agreement countries | Ongoing | https://www.epfindia.gov.in | Primary | NOT MODELLED | GAP: Out of scope for current engine |
| "PF wages" definition under Labour Codes | Basic+DA must be ≥ 50% of gross (Code on Wages, 2020, notified Nov 2025) | 2025-11-21 (codes notified) | https://omnivoo.com/blog/india-labour-codes-implementation-2026 | Secondary | `basicDaMinPercentOfGross: "50"` — statutory-registry.ts:175. `validateLabourCodeWageDefinition()` implemented. | Functionally correct in code. Labour Codes now notified; final central rules May 2026 but state rules still in draft (see §9). |

---

## 2. ESI (Employees' State Insurance)

> **[UNVERIFIED — requires CA/payroll professional sign-off]**

| Parameter | Value | Effective from | Source URL | Source type | Our code has (file:line) | Discrepancy? |
|---|---|---|---|---|---|---|
| Employee contribution rate | 0.75% of gross wages | 1 Jul 2019 (reduced from 1.75%) | https://www.esic.gov.in / https://cleartax.in/s/esi-rate | Primary / Secondary | `"0.75"` — statutory-registry.ts:114 / statutory-packs.ts:57 | None |
| Employer contribution rate | 3.25% of gross wages | 1 Jul 2019 (reduced from 4.75%) | Same | Primary / Secondary | `"3.25"` — statutory-registry.ts:115 / statutory-packs.ts:66 | None |
| Monthly gross wage eligibility ceiling (general) | ₹21,000 | 1 Jan 2017 (unchanged as of FY2026-27) | https://www.esic.gov.in / https://tallysolutions.com/business-guides/esi-contribution-rate-2026-current-percentage-for-employer-employee/ | Primary / Secondary | `"21000.00"` — statutory-registry.ts:116 | None |
| Monthly wage ceiling (employees with disabilities) | ₹25,000 | Current | https://tallysolutions.com/business-guides/esi-contribution-rate-2026-current-percentage-for-employer-employee/ | Secondary | NOT MODELLED | GAP: No disability-ceiling path |
| Daily wage exemption (employee share) | ≤ ₹176/day — employer still pays 3.25% | Current | Same secondary source | Secondary | NOT MODELLED | Minor GAP |
| ESI applicability threshold (establishments) | 10 employees (some states: 20) | Ongoing | https://labourlawreporter.com/esi.asp | Secondary | `enabledByDefault: false` — correct; no threshold validation | GAP: No establishment-size guard |
| Mid-period ceiling crossing | Employee stays covered until end of contribution period; benefits extend 6 months after last active period | Ongoing | Same | Secondary | NOT MODELLED | Known product gap — engine exits immediately on ceiling breach |
| Contribution period 1 | 1 Apr – 30 Sep | Ongoing | https://www.esic.gov.in | Primary | NOT MODELLED | GAP: No period tracking |
| Contribution period 2 | 1 Oct – 31 Mar | Ongoing | Same | Primary | NOT MODELLED | GAP: No period tracking |
| Payment due date | 15th of following month | Ongoing | Same | Primary | Noted in complianceChecklist — statutory-packs.ts:94 | None (informational only) |
| ESI half-yearly return | Period 1: due 11 Nov; Period 2: due 12 May | Ongoing | https://taxgarden.in/blog/pf-esi-compliance-employer-contribution-rates-2026 | Secondary | Not in code | GAP |

---

## 3. Professional Tax (PT)

> **[UNVERIFIED — requires CA/payroll professional sign-off. PT slabs are state legislation; always verify against official state commercial-tax department portal before production use.]**
>
> PT is authorised by Article 276(2) of the Constitution. Constitutional maximum: ₹2,500 per person per financial year.
> PT is based on where the employee **works**, not where they live.

### 3a. States WITH Professional Tax

| State | Code | Monthly Salary Threshold & Monthly PT | Annual Max | Effective from | Source URL | Source type | Our code has | Discrepancy? |
|---|---|---|---|---|---|---|---|---|
| Maharashtra | MH | ≤₹7,500 (male): Nil; ₹7,501–₹10,000: ₹175; >₹10,000: ₹200 (₹300 in Feb = ₹2,500/yr) | ₹2,500 | Current | https://www.indpayroll.com/blog/professional-tax-slab-rates-by-state-in-india-2026-complete-guide | Secondary | `"200.00"` flat — statutory-registry.ts:123 | **PARTIAL**: code uses flat ₹200 but MH has slabs (₹175 band) + gender exception for women (≤₹25,000 Nil for women). |
| Karnataka | KA | ≤₹15,000: Nil; ₹15,001–₹25,000: ₹150; >₹25,000: ₹200 (₹300 in Feb) | ₹2,400 | Apr 2025 (threshold raised to ₹25,000) | Same | Secondary | `"200.00"` flat — statutory-registry.ts:124 | **PARTIAL**: code ignores Nil and ₹150 bands; correct for high earners only |
| West Bengal | WB | ≤₹10,000: Nil; ₹10,001–₹15,000: ₹110; ₹15,001–₹25,000: ₹130; ₹25,001–₹40,000: ₹150; >₹40,000: ₹200 | ₹2,400 | Current | Same | Secondary | `"150.00"` flat — statutory-registry.ts:126 | **WRONG**: code uses ₹150 flat, misses Nil/₹110/₹130/₹200 bands |
| Andhra Pradesh | AP | ≤₹15,000: Nil; ₹15,001–₹20,000: ₹150; >₹20,000: ₹200 | ₹2,400 | Current | Same | Secondary | `"200.00"` — statutory-registry.ts:128 | **PARTIAL**: code ignores Nil and ₹150 bands |
| Telangana | TS | ≤₹15,000: Nil; ₹15,001–₹20,000: ₹150; >₹20,000: ₹200 | ₹2,400 | Current | Same | Secondary | `"200.00"` — statutory-registry.ts:129 AND `"200.00"` under key `TL` (non-standard code) | **PARTIAL** + `TL` is not a valid ISO state code (see §3c) |
| Tamil Nadu | TN | Half-yearly basis: ≤₹21,000: Nil; then progressive to ₹1,250 per half-year | ₹2,500 | Current | Same | Secondary | `"208.33"` monthly average — statutory-registry.ts:125 | **SIMPLIFICATION**: TN is half-yearly, not monthly. ₹208.33 is the annual average (₹2,500/12). Engine must track half-yearly periods. |
| Gujarat | GJ | ≤₹5,999: Nil; ₹6,000–₹8,999: ₹80; ₹9,000–₹11,999: ₹150; ≥₹12,000: ₹200 | ₹2,400 | Current | Same | Secondary | `"200.00"` flat — statutory-registry.ts:127 | **PARTIAL**: code ignores lower slabs; overstates for ₹6K-₹12K earners |
| Madhya Pradesh | MP | ≤₹18,750: Nil; ₹18,751–₹25,000: ₹125; >₹25,000: ₹208 | ₹2,500 | Current | Same | Secondary | `"200.00"` — statutory-registry.ts:133 | **PARTIAL + AMOUNT WRONG**: MP top rate is ₹208/mo (₹2,500/yr), code has ₹200 |
| Odisha | OR | Monthly slabs exist; max ~₹200/mo | ₹2,400 | Current | https://ezhrm.in/professional-tax-india-2026-state-wise-slabs-filing-guide/ | Secondary | `"200.00"` — statutory-registry.ts:136 | Possibly correct for high earners; slabs not fully verified |
| Kerala | KL | **Half-yearly basis**: ≤₹11,999 (6-mo income): Nil; slabs to ₹1,250 per half-year | ₹2,500 | Current | https://www.indpayroll.com/blog/professional-tax-slab-rates-by-state-in-india-2026-complete-guide | Secondary | **`"0.00"` (exempt)** — statutory-registry.ts:137 | **WRONG**: Kerala DOES levy PT. Code incorrectly shows no PT for KL. |
| Assam | AS | Monthly/annual slabs; PT applicable | Current | https://ezhrm.in/professional-tax-india-2026-state-wise-slabs-filing-guide/ | Secondary | **`"0.00"` (exempt)** — statutory-registry.ts:139 | **WRONG**: Assam DOES levy PT. Code incorrectly shows no PT for AS. |
| Bihar | BR | Annual slabs (e.g. ₹3L–₹5L: ₹1,000/yr) | ~₹2,500 | Current | https://ezhrm.in/professional-tax-india-2026-state-wise-slabs-filing-guide/ | Secondary | **`"0.00"` (exempt)** — statutory-registry.ts:135 | **WRONG**: Bihar DOES levy PT. Code incorrectly shows no PT. |
| Jharkhand | JH | PT exists — slabs to be verified | Current | Same | Secondary | **NOT IN CODE** | **GAP**: Missing from byState map |
| Sikkim | SK | Annual slabs; max ~₹2,400/yr | Current | Same | Secondary | **NOT IN CODE** | **GAP** |
| Manipur | MN | ₹208/mo × 11 + ₹212 in last month | ₹2,500 | Current | https://ezhrm.in/professional-tax-india-2026-state-wise-slabs-filing-guide/ | Secondary | **NOT IN CODE** | **GAP** |
| Mizoram | MZ | PT exists | Current | Same | Secondary | **NOT IN CODE** | **GAP** |
| Meghalaya | ML | Annual slabs | Current | Same | Secondary | **NOT IN CODE** | **GAP** |
| Tripura | TR | Monthly slabs (revised Jul 2018) | Current | Same | Secondary | **NOT IN CODE** | **GAP** |

### 3b. States WITHOUT Professional Tax

| State | Code | Our code has | Discrepancy? |
|---|---|---|---|
| Delhi | DL | `"0.00"` — statutory-registry.ts:132 | Correct |
| Haryana | HR | **`"200.00"`** — statutory-registry.ts:130 | **WRONG**: Haryana does NOT levy PT. Employees being overcharged ₹200/mo. |
| Punjab | PB | **`"200.00"`** — statutory-registry.ts:131 | **WRONG**: Punjab does NOT levy PT. Employees being overcharged ₹200/mo. |
| Rajasthan | RJ | **`"200.00"`** — statutory-registry.ts:132 | **WRONG**: Rajasthan does NOT levy PT. Employees being overcharged ₹200/mo. |
| Uttar Pradesh | UP | **`"200.00"`** — statutory-registry.ts:134 | **WRONG**: UP does NOT levy PT. Employees being overcharged ₹200/mo. |
| Uttarakhand | UK | Not in code | Correctly absent |
| Himachal Pradesh | HP | Not in code | Correctly absent |
| J&K | JK | Not in code | Correctly absent |
| Chhattisgarh | CG | Not in code | Correctly absent |
| Goa | GA | Not in code | Correct (Goa has no PT per secondary sources) |

Sources for §3a/3b: https://www.indpayroll.com/blog/professional-tax-slab-rates-by-state-in-india-2026-complete-guide · https://ezhrm.in/professional-tax-india-2026-state-wise-slabs-filing-guide/ · https://taxguru.in/corporate-law/state-wise-professional-tax-slab-rates-2024-2025.html · https://www.zoho.com/in/payroll/academy/taxes-and-compliance/professional-tax-rules.html

### 3c. Code Bug — `TL` state key

The code has `TL: "200.00"` at statutory-registry.ts:129 alongside `TS: "200.00"` at line 129. `TL` is not a recognized ISO 3166-2:IN state code. Telangana is `TS`. There is no state with code `TL`. This is either a duplicate entry or a typo. The `resolvePtMonthly()` function would return the `TL` value if an org passes `"TL"` as the state code, but no real Indian state uses `TL`.

---

## 4. Labour Welfare Fund (LWF)

> **[UNVERIFIED — requires CA/payroll professional sign-off. LWF rates are fixed by each state's Labour Welfare Board and change by government order without central notification.]**
>
> LWF applies in approximately 16 states/UTs. Contributions are fixed rupee amounts (not salary percentages). Frequency varies: monthly, half-yearly, or annual.

### 4a. States with active LWF

| State | Code | Employee (₹) | Employer (₹) | Frequency | Source | Source type | Our code has | Discrepancy? |
|---|---|---|---|---|---|---|---|---|
| Maharashtra | MH | 25 | 75 | Half-yearly (Jun & Dec) | https://salarybox.in/blog/labour-welfare-fund-lwf-state-wise-rates-due-dates-employer-obligations/ | Secondary | `{empFixed:"25.00", erFixed:"75.00"}` — statutory-registry.ts:148 | **NONE** (revised from ₹12/₹36 in Mar 2024; code has correct revised values) |
| Karnataka | KA | 50 | 100 | **Annual** (Dec deduction, remit Jan 31) | Same + https://ezhrm.in/labour-welfare-fund-india-2026-state-wise-guide/ | Secondary | `{empFixed:"20.00", erFixed:"40.00"}` — statutory-registry.ts:149 | **WRONG**: Revised to ₹50/₹100 annually in 2025; code still has old ₹20/₹40 half-yearly amounts |
| Tamil Nadu | TN | 20 | 40 | Annual | Same | Secondary | `{empFixed:"20.00", erFixed:"40.00"}` — statutory-registry.ts:150 | **NONE** (revised from ₹10/₹20 in Dec 2022; code has correct revised values) |
| West Bengal | WB | 3 | 30 | Half-yearly | Same | Secondary | `{empFixed:"3.00", erFixed:"15.00"}` — statutory-registry.ts:151 | **WRONG**: Employer share revised from ₹6 to ₹30 in Jan 2024. Code still has ₹15 (old value). |
| Gujarat | GJ | 6 | 12 | Half-yearly | Same | Secondary | `{empFixed:"6.00", erFixed:"12.00"}` — statutory-registry.ts:152 | **NONE** |
| Delhi | DL | 2 | 5 | Half-yearly | Same | Secondary | `{empFixed:"0.75", erFixed:"2.25"}` — statutory-registry.ts:153 | **WRONG**: Code has old values ₹0.75/₹2.25; revised to ₹2/₹5 per secondary sources. Needs primary verification. |
| Haryana | HR | ~₹31 | ~₹62 | Monthly (CPI-indexed) | Same | Secondary | `{empFixed:"25.00", erFixed:"50.00"}` — statutory-registry.ts:154 | **APPROXIMATE MISMATCH**: Haryana rates are CPI-linked and vary; code has static values. |
| Punjab | PB | 5 | 20 | Monthly | Same | Secondary | `{empFixed:"5.00", erFixed:"20.00"}` — statutory-registry.ts:155 | **NONE** |
| Kerala | KL | 20 | 20 | Half-yearly | Same | Secondary | `{empFixed:"20.00", erFixed:"20.00"}` — statutory-registry.ts:157 | Possibly correct — needs verification against Kerala LWF Act |
| Madhya Pradesh | MP | 10 | 30 | Half-yearly | Same | Secondary | `{empFixed:"10.00", erFixed:"30.00"}` — statutory-registry.ts:158 | Possibly correct |
| Andhra Pradesh | AP | Not specified clearly | Not specified | Annual | Same | Secondary | **NOT IN CODE** | **GAP** |
| Telangana | TS | 2 | 5 | Annual | Same | Secondary | **NOT IN CODE** | **GAP** |
| Goa | GA | 60 | 120 | Half-yearly | Same | Secondary | **NOT IN CODE** | **GAP** |
| Chhattisgarh | CG | Exists — amounts unclear | Half-yearly | Same | Secondary | **NOT IN CODE** | **GAP** |
| Odisha | OR | Exists | Exists | Periodic | Same | Secondary | **NOT IN CODE** | **GAP** |
| Chandigarh | CH | Exists | Exists | Periodic | Same | Secondary | **NOT IN CODE** | **GAP** |

**STATES WITHOUT LWF** (not in code, correctly absent): UP, Bihar, Rajasthan, Jharkhand, Assam, northeastern states.

Due dates summary: Half-yearly states → July 15 / January 15 (or June 30 / Dec 31 in some states). Annual states → January 31. Monthly states (Punjab, Haryana) → last day of month.

---

## 5. Income Tax (Salary TDS)

> **[UNVERIFIED — requires CA/payroll professional sign-off. Always verify against the current Finance Act / Income Tax Act 2025 before applying to production payroll.]**

### 5a. New Regime — FY2025-26 (AY2026-27) — Budget 2025 changes

The **Union Budget 2025 (presented 1 Feb 2025)** significantly changed the new regime slabs and rebate effective **1 April 2025** (FY2025-26). These slabs were **confirmed unchanged** by Budget 2026 for FY2026-27.

| Parameter | FY2025-26 correct value | Source | Source type | Our code has (IN_STATUTORY_2025_04) | Discrepancy? |
|---|---|---|---|---|---|
| Standard deduction (new regime) | ₹75,000 | https://incometaxreturnindia.com/income-tax-slabs/ · https://cleartax.in/c/income-tax-slab-rates | Secondary | `7_500_000` paise = ₹75,000 — statutory-registry.ts:186 | **NONE** |
| Slab 1 (zero band) | ₹0 – ₹4,00,000: **0%** | Same | Secondary | ₹0 – ₹3,00,000: 0% — statutory-registry.ts:188 | **WRONG**: Budget 2025 raised zero band to ₹4L; code still has pre-Budget 2025 ₹3L |
| Slab 2 | ₹4,00,001 – ₹8,00,000: **5%** | Same | Secondary | ₹3,00,001 – ₹7,00,000: 5% | **WRONG**: ₹4L–₹8L boundary |
| Slab 3 | ₹8,00,001 – ₹12,00,000: **10%** | Same | Secondary | ₹7,00,001 – ₹10,00,000: 10% | **WRONG**: ₹8L–₹12L boundary |
| Slab 4 | ₹12,00,001 – ₹16,00,000: **15%** | Same | Secondary | ₹10,00,001 – ₹12,00,000: 15% | **WRONG**: ₹12L–₹16L boundary |
| Slab 5 | ₹16,00,001 – ₹20,00,000: **20%** | Same | Secondary | ₹12,00,001 – ₹15,00,000: 20% | **WRONG**: ₹16L–₹20L boundary |
| Slab 6 (missing in code) | ₹20,00,001 – ₹24,00,000: **25%** | Same | Secondary | **ABSENT** (code jumps from 20% band to 30%) | **MISSING SLAB**: 25% band entirely absent |
| Slab 7 | Above ₹24,00,000: **30%** | Same | Secondary | Above ₹15,00,000: 30% | **WRONG** threshold |
| §87A rebate (new regime) | ₹60,000 max | Same | Secondary | `2_500_000` paise = **₹25,000** — statutory-registry.ts:194 | **WRONG**: Budget 2025 doubled rebate to ₹60,000; code still has old ₹25,000 |
| §87A rebate income limit (new regime) | ₹12,00,000 | Same | Secondary | `70_000_000` paise = **₹7,00,000** — statutory-registry.ts:195 | **WRONG**: Budget 2025 raised limit to ₹12L; code still has old ₹7L |

> **ROOT CAUSE**: The `IN_STATUTORY_2025_04` bundle (effective 2025-04-01) contains pre-Budget 2025 slabs. The Budget 2025 changes applicable from FY2025-26 were placed in `IN_STATUTORY_2026_04` instead. Any payroll run in **FY2025-26 (April 2025 – March 2026)** computed salary TDS on the wrong slab structure.

### 5b. New Regime — FY2026-27 (AY2027-28) — Budget 2026 (unchanged from Budget 2025)

| Parameter | FY2026-27 value | Source | Source type | Our code has (IN_STATUTORY_2026_04) | Discrepancy? |
|---|---|---|---|---|---|
| Standard deduction (new regime) | ₹75,000 | https://www.bwlegalworld.com/article/budget-2026-keeps-income-tax-slabs-unchanged-for-fy-2026-27-591689 | Secondary | `7_500_000` paise = ₹75,000 — statutory-registry.ts:237 | **NONE** |
| Slab 1 | ₹0 – ₹4,00,000: 0% | Same | Secondary | uptoRupees: 400_000, 0% — statutory-registry.ts:239 | **NONE** |
| Slab 2 | ₹4,00,001 – ₹8,00,000: 5% | Same | Secondary | uptoRupees: 800_000, 5% | **NONE** |
| Slab 3 | ₹8,00,001 – ₹12,00,000: 10% | Same | Secondary | uptoRupees: 1_200_000, 10% | **NONE** |
| Slab 4 | ₹12,00,001 – ₹16,00,000: 15% | Same | Secondary | uptoRupees: 1_600_000, 15% | **NONE** |
| Slab 5 | ₹16,00,001 – ₹20,00,000: 20% | Same | Secondary | uptoRupees: 2_000_000, 20% | **NONE** |
| Slab 6 | ₹20,00,001 – ₹24,00,000: 25% | Same | Secondary | uptoRupees: 2_400_000, 25% | **NONE** |
| Slab 7 | Above ₹24,00,000: 30% | Same | Secondary | uptoRupees: null, 30% | **NONE** |
| §87A rebate | ₹60,000 max | Same | Secondary | `6_000_000` paise = ₹60,000 — statutory-registry.ts:249 | **NONE** |
| §87A rebate income limit | ₹12,00,000 | Same | Secondary | `120_000_000` paise = ₹12,00,000 — statutory-registry.ts:250 | **NONE** |

### 5c. Old Regime — Both FY2025-26 and FY2026-27 (unchanged)

| Parameter | Value | Source | Source type | Our code has | Discrepancy? |
|---|---|---|---|---|---|
| Standard deduction (old regime) | ₹50,000 | https://cleartax.in/c/income-tax-slab-rates | Secondary | `5_000_000` paise = ₹50,000 | **NONE** |
| Slab 1 | ₹0 – ₹2,50,000: 0% | Same | Secondary | uptoRupees: 250_000, 0% | **NONE** |
| Slab 2 | ₹2,50,001 – ₹5,00,000: 5% | Same | Secondary | uptoRupees: 500_000, 5% | **NONE** |
| Slab 3 | ₹5,00,001 – ₹10,00,000: 20% | Same | Secondary | uptoRupees: 1_000_000, 20% | **NONE** |
| Slab 4 | Above ₹10,00,000: 30% | Same | Secondary | uptoRupees: null, 30% | **NONE** |
| §87A rebate (old regime) | ₹12,500 max; income ≤ ₹5,00,000 | Same | Secondary | `1_250_000` paise = ₹12,500; limit `50_000_000` paise = ₹5L | **NONE** |
| Senior citizen basic exemption (old regime, 60–79) | ₹3,00,000 | Same | Secondary | **NOT MODELLED** | GAP |
| Super senior citizen exemption (old regime, 80+) | ₹5,00,000 | Same | Secondary | **NOT MODELLED** | GAP |

### 5d. Surcharge (both regimes — NOT modelled in code)

| Income range | Old regime surcharge | New regime surcharge | Source | Our code has | Discrepancy? |
|---|---|---|---|---|---|
| ≤ ₹50 lakh | 0% | 0% | https://www.axismaxlife.com/blog/tax-savings/income-tax-slab-2026-27 | NOT MODELLED | **GAP**: surcharge absent |
| ₹50L – ₹1Cr | 10% | 10% | Same | NOT MODELLED | **GAP** |
| ₹1Cr – ₹2Cr | 15% | 15% | Same | NOT MODELLED | **GAP** |
| ₹2Cr – ₹5Cr | 25% | 25% | Same | NOT MODELLED | **GAP** |
| Above ₹5Cr | 37% | **25% (capped in new regime)** | Same | NOT MODELLED | **GAP** |

### 5e. Health & Education Cess

| Parameter | Value | Source | Source type | Our code has | Discrepancy? |
|---|---|---|---|---|---|
| Cess | 4% on tax + surcharge | https://cleartax.in/c/income-tax-slab-rates | Secondary | `cessPercent: "4"` — statutory-registry.ts:209 (both bundles) | **NONE** |

### 5f. Default regime and switching

| Parameter | Value | Effective from | Source | Our code has | Discrepancy? |
|---|---|---|---|---|---|
| Default regime | New regime is the default | FY2024-25 | https://incometaxreturnindia.com/income-tax-slabs/ | NOT MODELLED — both regimes available as options | Acceptable: engine offers both |
| Employee opt-out window | Employee must declare old-regime preference at start of FY or on joining | Ongoing | Same | NOT MODELLED | GAP: No regime election enforcement |

### 5g. TDS form labels (FY2025-26 vs FY2026-27)

| Parameter | FY2025-26 | FY2026-27 | Source | Source type | Our code has | Discrepancy? |
|---|---|---|---|---|---|---|
| Quarterly salary TDS return | Form 24Q | **Form 138** (Income Tax Act 2025, effective 1 Apr 2026) | https://taxupdate.in/income-tax/811/new-tds-tcs-return-forms-fy-2026-27-form-138-140-143-144-due-31-july-2026/ | Secondary | 2025: "Form 24Q"; 2026: "Form 138" | **NONE** |
| Annual TDS certificate to employee | Form 16 | **Form 130** (same Act) | Same | Secondary | 2025: "Form 16"; 2026: "Form 130" | **NONE** |

### 5h. HRA Exemption

| Parameter | Value | Source | Our code | Discrepancy? |
|---|---|---|---|---|
| Metro cities | Mumbai, Delhi, Kolkata, Chennai | Income Tax Act §10(13A) | `["Mumbai","Delhi","Kolkata","Chennai"]` — statutory-registry.ts:169 | **NONE** |
| Metro HRA exemption | 50% of basic | Same | `"50"` — statutory-registry.ts:170 | **NONE** |
| Non-metro HRA exemption | 40% of basic | Same | `"40"` — statutory-registry.ts:171 | **NONE** |
| Available in new regime | **NO** — HRA exemption is NOT available in the new tax regime from FY2020-21 | https://cleartax.in/c/income-tax-slab-rates | NOT MODELLED | **GAP**: HRA calc should be disabled or flagged for employees on new regime |

---

## 6. Gratuity

> **[UNVERIFIED — requires CA/payroll professional sign-off]**

| Parameter | Value | Effective from | Source URL | Source type | Our code has | Discrepancy? |
|---|---|---|---|---|---|---|
| Governing law | Payment of Gratuity Act, 1972 | Ongoing | https://vakilsearch.com/article/gratuity-rules-india-eligibility-tax/ | Secondary | Not modelled as law reference | N/A |
| Minimum service eligibility | **5 years** (4 years + 240 working days treated as 5 years per SC ruling) | Ongoing | Same | Secondary | `eligibilityYears: 5` — statutory-registry.ts:164 | **NONE** |
| Formula | (Last drawn Basic+DA × 15 × completed years) ÷ 26 | Ongoing | Same | Secondary | Provision rate 4.81% of basic used (monthly accrual proxy) | **SIMPLIFICATION**: 4.81% is an approximation (15/26/12 × 1 ≈ 4.81% of monthly). The statutory formula uses last drawn salary, not current, so actual settlement differs from provision. |
| Statutory ceiling (private sector) | **₹20,00,000** | 29 Mar 2018 (Amendment Act 2018) | https://www.bajajfinservmarkets.in/income-tax/income-tax-exemptions-on-gratuity | Secondary | **NOT MODELLED** — no ceiling cap on provision | **GAP**: ₹20L ceiling not enforced. Engine must cap actual gratuity payout at ₹20L. |
| Statutory ceiling (Central Govt employees) | ₹25,00,000 | 1 Jan 2024 | Same | Secondary | NOT MODELLED | OUT OF SCOPE for private payroll |
| Tax exemption (private sector) | Exempt up to ₹20 lakh under §10(10) | Current | Same | Secondary | NOT MODELLED as a TDS adjustment | GAP |
| Death/disability — no minimum service | No service minimum; full gratuity payable | Ongoing | Same | Secondary | NOT MODELLED | GAP |
| Fixed-term contract workers | Pro-rata after 1 year (under Code on Social Security, 2020) | Nov 2025 (codes notified) | https://labourlawreporter.com/gratuity.asp | Secondary | NOT MODELLED | GAP |
| Wage base | Basic + DA only (excludes HRA, bonus, allowances) | Ongoing | Same | Secondary | `wageBase: "last_drawn_basic_da"` — statutory-registry.ts:165 | **NONE** (correct definition) |

---

## 7. Bonus (Payment of Bonus Act, 1965)

> **[UNVERIFIED — requires CA/payroll professional sign-off]**
>
> **The bonus module is entirely absent from the payroll engine.** No items below are modelled.

| Parameter | Value | Effective from | Source URL | Source type | Our code has | Discrepancy? |
|---|---|---|---|---|---|---|
| Applicability threshold | Establishments with 20+ employees (or any factory) | Ongoing | https://ezhrm.in/statutory-bonus-india-2026-calculation-eligibility-filing/ | Secondary | **NOT MODELLED** | **GAP** |
| Employee eligibility ceiling | ≤ ₹21,000/month (Basic+DA) | Nov 2015 amendment (effective 1 Apr 2014) | Same | Secondary | NOT MODELLED | GAP |
| Minimum bonus % | **8.33%** of annual eligible wages | Ongoing | Same | Secondary | NOT MODELLED | GAP |
| Maximum bonus % | **20%** of annual eligible wages | Ongoing | Same | Secondary | NOT MODELLED | GAP |
| Calculation ceiling | **₹7,000/month** or state minimum wage for scheduled employment, whichever is higher | Nov 2015 amendment | Same | Secondary | NOT MODELLED | GAP |
| Minimum working days | 30 days in accounting year | Ongoing | Same | Secondary | NOT MODELLED | GAP |
| Payment deadline (FY2025-26) | 30 November 2026 | Ongoing | Same | Secondary | NOT MODELLED | GAP |
| Taxability | Fully taxable as salary income | Ongoing | Same | Secondary | NOT MODELLED | GAP |
| Code on Wages status | Act listed for repeal under Code on Wages but code NOT fully notified as of 2026-07-31 — Act still in force | Nov 2025 (codes notified, state rules pending) | https://omnivoo.com/blog/india-labour-codes-implementation-2026 | Secondary | NOT MODELLED | GAP |

---

## 8. Leave Encashment

> **[UNVERIFIED — requires CA/payroll professional sign-off]**

| Parameter | Value | Effective from | Source URL | Source type | Our code has | Discrepancy? |
|---|---|---|---|---|---|---|
| Governing provision | §10(10AA) of Income Tax Act 1961 (renumbered in Income Tax Act 2025) | Ongoing | https://darwinbox.com/blog/exemption-of-leave-encashment | Secondary | NOT MODELLED (no leave encashment TDS adjustment) | GAP |
| Private-sector exemption ceiling | **₹25,00,000** (lifetime aggregate across all employers) | 1 Apr 2023 (Finance Act 2023; raised from ₹3L) | https://legalsuvidha.com/blog/leave-encashment-tax-exemption | Secondary | NOT MODELLED | GAP |
| FY2025-26 ceiling | ₹25,00,000 — unchanged | Same | Same | Secondary | NOT MODELLED | GAP |
| FY2026-27 ceiling | ₹25,00,000 — Budget 2026 made no change | https://taxgarden.in/blog/leave-encashment-tax-rules-section-10-10aa-india | Secondary | NOT MODELLED | GAP |
| Exemption formula | Min of: (i) actual received, (ii) 10 months' avg salary, (iii) cash value of unutilised leave capped at 30 days/year of service, (iv) ₹25L lifetime cap | Same | Same | Secondary | NOT MODELLED | GAP |
| During-service encashment | **Fully taxable** — §10(10AA) does NOT apply | Ongoing | Same | Secondary | NOT MODELLED | GAP |
| Available in new regime? | **YES** — one of few exemptions retained in new regime | Ongoing | Same | Secondary | NOT MODELLED | GAP |
| Government employees | Fully exempt (no limit) | Ongoing | Same | Secondary | NOT MODELLED | GAP |

---

## 9. Labour Codes Status

> **[UNVERIFIED — requires CA/payroll professional sign-off. Implementation is uneven across states.]**

| Code | Status | Effective date | Source URL | Source type | Impact on payroll |
|---|---|---|---|---|---|
| Code on Wages, 2019 | **Notified 21 Nov 2025; Central Rules notified 8 May 2026** | Central: 8 May 2026. State rules: varies | https://kpmg.com/xx/en/our-insights/gms-flash-alert/2026/flash-alert-2026-127.html · https://omnivoo.com/blog/india-labour-codes-implementation-2026 | Secondary (KPMG primary-adjacent) | Uniform wage definition. "Wages" = Basic+DA must be ≥ 50% of total remuneration. |
| Industrial Relations Code, 2020 | Same — notified 21 Nov 2025; Central Rules 8 May 2026 | Same | Same | Secondary | Standing orders, notice period |
| Code on Social Security, 2020 | Same | Same | Same | Secondary | EPF/ESI/gratuity/bonus definitions align; new EPF Scheme 2026 (29 Jun 2026) implements this |
| OSH Code, 2020 | Same | Same | Same | Secondary | Working conditions; payroll-adjacent |
| State rules status (major states) | Maharashtra, Tamil Nadu, Kerala, Punjab, Rajasthan, Telangana, AP, West Bengal — **STILL IN DRAFT** | No confirmed date | https://beaconfiling.com/blog/labour-code-implementation-tracker-states | Secondary | These state employees still governed by old Acts |
| State rules (11 states with final rules) | MP, UP, Gujarat, Karnataka, Haryana, Uttarakhand, Jharkhand, Odisha, Bihar, Chhattisgarh, Assam | 2026 | Same | Secondary | These states enforce new definitions |

**Payroll engine implication**: The 50% Basic+DA rule is already validated in code (`validateLabourCodeWageDefinition`), but it is advisory only. Enforcement is mixed until all state rules are finalized.

---

## 10. Filing Artefacts & Deadlines

> **[UNVERIFIED — requires CA/payroll professional sign-off. Due dates may change by notification.]**

| Filing | Period | Due Date | Penalty for late | Source | Source type | Our code has | Discrepancy? |
|---|---|---|---|---|---|---|---|
| EPF ECR (Electronic Challan cum Return) | Monthly | **15th of following month** | 12% p.a. interest + damages up to 25% | https://www.edps.in/blogs/epfo-ecr-deadline-2026-due-date-penalties-complete-filing-guide | Secondary | In complianceChecklist as "15th" — statutory-packs.ts:94 | **NONE** (informational) |
| Annual PF Return (Form 3A + 6A) | Annual | **30 April** following FY | Penalties under EPF Act | https://taxgarden.in/blog/pf-esi-compliance-employer-contribution-rates-2026 | Secondary | NOT in complianceChecklist | GAP |
| ESIC Contribution payment | Monthly | **15th of following month** | Prosecution under §85a & §85A ESI Act | Same | Secondary | In complianceChecklist — correct | NONE |
| ESIC Half-yearly return — Period 1 (Apr–Sep) | Half-yearly | **11 November** | Same | Same | Secondary | NOT in complianceChecklist | GAP |
| ESIC Half-yearly return — Period 2 (Oct–Mar) | Half-yearly | **12 May** | Same | Same | Secondary | NOT in complianceChecklist | GAP |
| Form 24Q / Form 138 (salary TDS return) | Quarterly | Q1: 31 Jul; Q2: 31 Oct; Q3: 31 Jan; Q4: 31 May | ₹200/day (§234E) + ₹10K–₹1L (§271H if >1yr late) | https://taxupdate.in/income-tax/811/new-tds-tcs-return-forms-fy-2026-27-form-138-140-143-144-due-31-july-2026/ | Secondary | "quarterly return due within 31 days after quarter end" in complianceChecklist — statutory-packs.ts:95 | **APPROXIMATELY CORRECT** but checklist text is imprecise; Q4 deadline is 31 May (not "31 days after") |
| Form 16 / Form 130 (annual TDS certificate to employee) | Annual | **31 May** of next FY | — | Same | Secondary | "must be issued by May 31st" — statutory-packs.ts:96 | **NONE** |
| PT payment (state-varying) | Monthly or half-yearly or annual | Varies by state; typically 15th following month | State-specific penalties | https://www.zoho.com/in/payroll/academy/taxes-and-compliance/professional-tax-rules.html | Secondary | NOT in complianceChecklist in detail | GAP |

---

## 11. Discrepancy Register — Ranked by Money Impact

> **[UNVERIFIED — requires CA/payroll professional sign-off]**

| Rank | Severity | Item | What code has | What source says | File:Line | Money impact |
|---|---|---|---|---|---|---|
| 1 | **P0-CRITICAL** | **FY2025-26 new-regime slabs**: Code has pre-Budget 2025 slabs (3L/7L/10L/12L/15L, 6 bands) | 3L–15L band thresholds | Budget 2025 slabs: 4L/8L/12L/16L/20L/24L, 7 bands | statutory-registry.ts:187–194 | **Every FY2025-26 payroll run computed TDS on wrong slabs.** Understates tax for ₹3L–₹4L range (code taxes at 5%, correct is 0%); misstates tax for all higher bands. |
| 2 | **P0-CRITICAL** | **FY2025-26 §87A rebate**: Code has ₹25,000 rebate up to ₹7L income | ₹25,000 rebate, ₹7L limit | Budget 2025: ₹60,000 rebate, ₹12L limit | statutory-registry.ts:194–195 | **Under-rebated every FY2025-26 employee earning ₹7L–₹12L.** Up to ₹35,000 excess TDS deducted. |
| 3 | **P1-HIGH** | **PT: Haryana (HR) wrongly set to ₹200** | `"200.00"` | HR has NO professional tax | statutory-registry.ts:130 | All HR-based employees over-deducted ₹200/month |
| 4 | **P1-HIGH** | **PT: Punjab (PB) wrongly set to ₹200** | `"200.00"` | PB has NO professional tax | statutory-registry.ts:131 | All PB-based employees over-deducted ₹200/month |
| 5 | **P1-HIGH** | **PT: Rajasthan (RJ) wrongly set to ₹200** | `"200.00"` | RJ has NO professional tax | statutory-registry.ts:132 | All RJ-based employees over-deducted ₹200/month |
| 6 | **P1-HIGH** | **PT: Uttar Pradesh (UP) wrongly set to ₹200** | `"200.00"` | UP has NO professional tax | statutory-registry.ts:134 | All UP-based employees over-deducted ₹200/month |
| 7 | **P1-HIGH** | **PT: Kerala (KL) wrongly set to ₹0** | `"0.00"` | KL levies PT (half-yearly slabs, up to ₹2,500/yr) | statutory-registry.ts:137 | KL employees under-deducted; employer compliance risk |
| 8 | **P1-HIGH** | **PT: Bihar (BR) wrongly set to ₹0** | `"0.00"` | Bihar levies PT (annual slabs) | statutory-registry.ts:135 | BR employees under-deducted; employer compliance risk |
| 9 | **P1-HIGH** | **PT: Assam (AS) wrongly set to ₹0** | `"0.00"` | Assam levies PT | statutory-registry.ts:139 | AS employees under-deducted; employer compliance risk |
| 10 | **P1-MEDIUM** | **LWF West Bengal (WB) employer share wrong** | `erFixed:"15.00"` | Revised to ₹30 (Jan 2024) | statutory-registry.ts:151 | WB employer remitting 50% of required LWF |
| 11 | **P1-MEDIUM** | **LWF Karnataka (KA) both amounts wrong** | `empFixed:"20.00", erFixed:"40.00"` | Revised to ₹50/₹100 annually (2025) | statutory-registry.ts:149 | KA employer remitting wrong amounts |
| 12 | **P1-MEDIUM** | **LWF Delhi (DL) amounts wrong** | `empFixed:"0.75", erFixed:"2.25"` | Should be ₹2/₹5 per secondary sources | statutory-registry.ts:153 | DL LWF under-remitted |
| 13 | **P2-MEDIUM** | **PT state matrices are slab-based, not flat** — WB (5 bands), GJ (4 bands), AP/TS/KA (3 bands) but code uses flat amounts | Flat ₹200/₹150 | Slab structure | statutory-registry.ts:121–139 | Lower-salary employees in these states over-deducted |
| 14 | **P2-MEDIUM** | **No EDLI or EPF admin charges** | Not modelled | 0.5% EDLI (cap ₹75/mo) + 0.5% admin (min ₹500/establishment) | statutory-packs.ts:44–52 | Employer cost understated in payroll journal; CTC calculation wrong |
| 15 | **P2-MEDIUM** | **No EPS split** | Employer PF shown as flat 12% | EPS 8.33% (cap ₹1,250/mo) + EPF 3.67% balance | statutory-registry.ts:108 | Passbook, pension reporting, and FnF settlement inaccurate |
| 16 | **P2-MEDIUM** | **Gratuity ₹20L ceiling not enforced** | Provision rate 4.81% only | Payout capped at ₹20L | statutory-registry.ts:163 | FnF settlement may over/undershoot actual statutory payout |
| 17 | **P2-LOW** | **Surcharge not modelled** (applies to high earners) | cessPercent only | 10%/15%/25%/37% (old) or capped 25% (new) | Both bundles | Affects high-salary employees (>₹50L income); minority of users |
| 18 | **P2-LOW** | **PT: Missing states** — JH, SK, MN, MZ, ML, TR, PY, and others | Not in byState | These states levy PT | statutory-registry.ts:122 | Employers in missing states silently fall back to default ₹200 (some correct, some not) |
| 19 | **P2-LOW** | **LWF: Missing states** — AP, TS, GA, CG, OR, CH | Not in byState | These states have active LWF | statutory-registry.ts:148 | LWF not collected in these states |
| 20 | **P2-LOW** | **`TL` is not a valid ISO state code** | key `"TL"` with `"200.00"` | No Indian state has code TL; Telangana = TS | statutory-registry.ts:129 | Orphan key; no real impact unless misconfigured |
| 21 | **P2-LOW** | **Bonus Act entirely absent** | Not modelled | 8.33%–20% of ₹7,000/month calculation ceiling | N/A | Statutory bonus not computed at all |
| 22 | **P2-LOW** | **Leave encashment TDS adjustment absent** | Not modelled | §10(10AA) ₹25L lifetime exemption | N/A | FnF TDS may overstate tax on encashment payout |
| 23 | **P2-LOW** | **HRA exemption in new regime** | `calcHraExemptionPaise` available to all | New regime disallows HRA exemption | statutory-registry.ts:323 | TDS understated if new-regime employee claims HRA |

---

## 12. Proposed Config-Table Shape

> **[UNVERIFIED — requires sign-off before schema adoption]**

The goal is to express all statutory rules as effective-dated DB rows rather than compiled TypeScript constants. A CA can update a row; no code deployment needed for a rate change.

### 12a. Master table: `statutory_rule_params`

Stores flat-rate, percentage, ceiling, and threshold parameters:

```sql
CREATE TABLE statutory_rule_params (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES organizations(id),   -- NULL = global default
  country         char(2)        NOT NULL,             -- ISO 3166-1 alpha-2 (e.g. 'IN')
  state_code      varchar(8),                          -- ISO 3166-2 sub-code or NULL for national
  param_key       varchar(64)    NOT NULL,             -- e.g. 'pf.employee_rate_pct'
  value_type      varchar(16)    NOT NULL              -- 'PERCENT' | 'RUPEES' | 'PAISE' | 'INTEGER' | 'TEXT'
    CHECK (value_type IN ('PERCENT','RUPEES','PAISE','INTEGER','TEXT')),
  value_numeric   numeric(18,6),                       -- populated for numeric types
  value_text      text,                                -- populated for TEXT type
  effective_from  date           NOT NULL,
  effective_to    date,                                -- NULL = currently in force
  source_url      text,
  source_type     varchar(16)    CHECK (source_type IN ('PRIMARY','SECONDARY')),
  notes           text,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  created_by      uuid,

  CONSTRAINT uq_statutory_param
    UNIQUE (country, state_code, param_key, effective_from, org_id)
);
```

**Worked example — flat-rate rows:**

| country | state_code | param_key | value_type | value_numeric | effective_from | source_type |
|---|---|---|---|---|---|---|
| IN | NULL | pf.employee_rate_pct | PERCENT | 12.000000 | 2014-09-01 | PRIMARY |
| IN | NULL | pf.monthly_wage_ceiling_rupees | RUPEES | 15000.00 | 2014-09-01 | PRIMARY |
| IN | NULL | esi.employee_rate_pct | PERCENT | 0.750000 | 2019-07-01 | PRIMARY |
| IN | NULL | esi.employer_rate_pct | PERCENT | 3.250000 | 2019-07-01 | PRIMARY |
| IN | NULL | esi.monthly_eligibility_ceiling_rupees | RUPEES | 21000.00 | 2017-01-01 | PRIMARY |
| IN | NULL | gratuity.statutory_ceiling_rupees | RUPEES | 2000000.00 | 2018-03-29 | PRIMARY |
| IN | MH | lwf.employee_fixed_rupees | RUPEES | 25.00 | 2024-03-01 | SECONDARY |
| IN | MH | lwf.employer_fixed_rupees | RUPEES | 75.00 | 2024-03-01 | SECONDARY |
| IN | MH | lwf.frequency | TEXT | HALF_YEARLY | 2024-03-01 | SECONDARY |

### 12b. Slab table: `statutory_rule_slabs`

For stepped/graduated structures (income tax, PT slabs, WB's 5-tier PT):

```sql
CREATE TABLE statutory_rule_slabs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES organizations(id),
  country         char(2)        NOT NULL,
  state_code      varchar(8),
  regime          varchar(16),          -- 'NEW' | 'OLD' | NULL
  slab_set_key    varchar(64)    NOT NULL,  -- e.g. 'income_tax.new_regime.slabs'
  slab_order      integer        NOT NULL,
  lower_bound     numeric(18,2)  NOT NULL DEFAULT 0,
  upper_bound     numeric(18,2),         -- NULL = no ceiling
  rate_pct        numeric(8,4),
  fixed_amount    numeric(18,2),
  period          varchar(8) DEFAULT 'MONTHLY'  -- 'MONTHLY' | 'HALF_YEARLY' | 'ANNUAL'
    CHECK (period IN ('MONTHLY','HALF_YEARLY','ANNUAL')),
  effective_from  date           NOT NULL,
  effective_to    date,
  source_url      text,
  source_type     varchar(16),
  notes           text,

  CONSTRAINT uq_slab
    UNIQUE (country, state_code, regime, slab_set_key, slab_order, effective_from, org_id)
);
```

**Worked example — FY2026-27 new-regime income tax slabs (same as Budget 2025 values):**

| country | slab_set_key | regime | slab_order | lower_bound | upper_bound | rate_pct | effective_from |
|---|---|---|---|---|---|---|---|
| IN | income_tax.new_regime.slabs | NEW | 1 | 0 | 400000 | 0.0000 | 2025-04-01 |
| IN | income_tax.new_regime.slabs | NEW | 2 | 400000 | 800000 | 5.0000 | 2025-04-01 |
| IN | income_tax.new_regime.slabs | NEW | 3 | 800000 | 1200000 | 10.0000 | 2025-04-01 |
| IN | income_tax.new_regime.slabs | NEW | 4 | 1200000 | 1600000 | 15.0000 | 2025-04-01 |
| IN | income_tax.new_regime.slabs | NEW | 5 | 1600000 | 2000000 | 20.0000 | 2025-04-01 |
| IN | income_tax.new_regime.slabs | NEW | 6 | 2000000 | 2400000 | 25.0000 | 2025-04-01 |
| IN | income_tax.new_regime.slabs | NEW | 7 | 2400000 | NULL | 30.0000 | 2025-04-01 |

**Note:** The slab effective_from is **2025-04-01** for both FY2025-26 and FY2026-27 since Budget 2026 did not change slabs. The effective-dated lookup handles this automatically.

### 12c. Lookup logic

```typescript
// Pseudo-code for engine to resolve a param
async function getStatutoryParam(
  country: string, stateCode: string | null,
  paramKey: string, asOfDate: Date
): Promise<StatutoryRuleParam | null> {
  // 1. Try org-specific override for (country, state, key, date)
  // 2. Fall back to global default
  // 3. Use state_code = NULL for national params
  // Most recent effective_from <= asOfDate AND (effective_to IS NULL OR effective_to >= asOfDate)
}
```

---

## 13. Coverage Gaps — Items Not Verified or Incomplete

> **[UNVERIFIED — requires CA/payroll professional sign-off]**

| Item | Gap | Why not verified | Priority |
|---|---|---|---|
| EPF contribution rates PDF (primary) | PDF binary could not be parsed | EPFO PDF download returned binary; needs direct access | P1 — verify all EPF numbers against primary |
| EPFO wage ceiling proposed increase to ₹21,000 | Research confirmed it is **delayed** but no new date | No official gazette notification found | P1 — revisit when EPFO notifies |
| Full PT slab for Kerala (half-yearly detail) | High-level slab only retrieved | State commercial-tax portal not directly fetched | P1 — needed for correct KL deduction |
| PT slab for Assam | "Assam levies PT" confirmed; specific slabs not retrieved | Need Assam Finance Dept. portal | P1 |
| PT slab for Bihar | "Bihar levies PT" confirmed; annual slab amounts not retrieved | Need Bihar Finance portal | P1 |
| PT for Jharkhand, Sikkim, Manipur, Meghalaya, Tripura, Mizoram | States confirmed to levy PT; no slabs retrieved | Need each state's commercial tax portal | P2 |
| LWF for AP, TS, GA, CG, OR, CH | States confirmed to have LWF; exact amounts not fully verified | Need state Labour Welfare Board orders | P2 |
| Haryana LWF CPI-indexed amounts | Approximate ₹31/₹62 only; exact current figure unclear | CPI linkage means monthly change | P2 |
| International worker PF rules | Not researched in depth | Complex SSA country-by-country rules | P3 |
| Surcharge with marginal relief calculation | Rates found; marginal relief formula not retrieved | Need IT Act §112A or circulars | P2 |
| Bonus Act allocable surplus formula | Minimum/maximum percentages found; surplus calculation rules not retrieved | Requires P&L data inputs; payroll-engine adjacent | P2 |
| Income Tax Act 2025 new section numbers | Renumbered sections confirmed (87A → Clause 156 per one source) | New Act full text not fetched | P1 — affects FY2026-27 filings |
| PT deductibility in new regime | Confirmed deductible per search (§16(iii) available under both regimes) | Need primary CBDT circular | P1 |
| ESI applicability by state (10 vs 20 employee threshold) | Confirmed variability; state-wise list not compiled | Need ESIC state portal list | P2 |

---

*End of R4 — India Statutory Rule Set.*

*Sources consulted (secondary unless otherwise stated):*
- *https://www.epfindia.gov.in (primary — PDF unreadable)*
- *https://www.esic.gov.in (primary — not directly fetched)*
- *https://taxfetchindia.com/blog/taxation-time/epfo-wage-ceiling-delay-2026-pf-contribution*
- *https://tallysolutions.com/business-guides/esi-contribution-rate-2026-current-percentage-for-employer-employee/*
- *https://cleartax.in/c/income-tax-slab-rates*
- *https://www.bajajfinserv.in/investments/income-tax-slabs*
- *https://incometaxreturnindia.com/income-tax-slabs/*
- *https://www.bwlegalworld.com/article/budget-2026-keeps-income-tax-slabs-unchanged-for-fy-2026-27-591689*
- *https://www.axismaxlife.com/blog/tax-savings/income-tax-slab-2026-27*
- *https://taxupdate.in/income-tax/811/new-tds-tcs-return-forms-fy-2026-27-form-138-140-143-144-due-31-july-2026/*
- *https://www.indpayroll.com/blog/professional-tax-slab-rates-by-state-in-india-2026-complete-guide*
- *https://ezhrm.in/professional-tax-india-2026-state-wise-slabs-filing-guide/*
- *https://taxguru.in/corporate-law/state-wise-professional-tax-slab-rates-2024-2025.html*
- *https://www.zoho.com/in/payroll/academy/taxes-and-compliance/professional-tax-rules.html*
- *https://salarybox.in/blog/labour-welfare-fund-lwf-state-wise-rates-due-dates-employer-obligations/*
- *https://ezhrm.in/labour-welfare-fund-india-2026-state-wise-guide/*
- *https://vakilsearch.com/article/gratuity-rules-india-eligibility-tax/*
- *https://www.bajajfinservmarkets.in/income-tax/income-tax-exemptions-on-gratuity*
- *https://ezhrm.in/statutory-bonus-india-2026-calculation-eligibility-filing/*
- *https://legalsuvidha.com/blog/leave-encashment-tax-exemption*
- *https://darwinbox.com/blog/exemption-of-leave-encashment*
- *https://kpmg.com/xx/en/our-insights/gms-flash-alert/2026/flash-alert-2026-127.html*
- *https://omnivoo.com/blog/india-labour-codes-implementation-2026*
- *https://taxgarden.in/blog/pf-esi-compliance-employer-contribution-rates-2026*
- *https://www.edps.in/blogs/epfo-ecr-deadline-2026-due-date-penalties-complete-filing-guide*
