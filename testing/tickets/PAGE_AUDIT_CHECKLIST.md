# Page-audit shared checklist

> Every `page-audit` ticket in M1/M2/M3 **and** every `mobile-audit` ticket in `m-mobile-responsive.md` must satisfy this checklist **in addition to** `testing/AUDIT_FRAMEWORK.md` Phases 1–6 for the named route (mobile-only tickets may skip non-mobile phases but **must** complete the Mobile section).  
> Prior UI ✅ in `testing/PAGES.md` does **not** mark page-audits done.  
> Attach evidence (screenshot and/or HAR / status codes) before flipping Status → `done`.

## Mandatory states (all pages)

| # | Check | Pass criteria |
|---|-------|---------------|
| S1 | Loading | Skeleton or loading UI matches layout; no blank flash of wrong data |
| S2 | Empty | Empty state fills content area with icon + message (+ primary action if create is allowed) |
| S3 | Error | Friendly error + retry; uses `getErrorMessage`; no raw stack |
| S4 | Unauthorized | Denied role: nav hidden or page gated; direct URL denied; matching API 403 |

## Interactions (when the page has them)

| # | Check | Pass criteria |
|---|-------|---------------|
| I1 | Forms | Empty submit shows per-field errors; invalid data rejected; valid submit persists without full-page refresh |
| I2 | Filters / search | Each filter changes results; clear restores list; no crash on special chars |
| I3 | Delete confirm | Destructive action opens confirm naming the item; Cancel keeps data; Confirm removes and survives refresh |
| I4 | Inline / mutations | Edits persist after refresh; double-submit does not create duplicates |

## Access

| # | Check | Pass criteria |
|---|-------|---------------|
| A1 | Role denied | At least one role without the page’s `@RequirePermission` / module gate cannot use the surface (UI + API) |
| A2 | Cross-tenant | Where the page loads org-scoped ids: Org Alpha session cannot read/mutate Org Beta ids (403/404). Skip only for pure platform-admin `/owner/*` with note “N/A — platform scope” |

## Mobile responsive (MANDATORY — not optional)

> Required on **every** page-audit and mobile-audit ticket. Fail the ticket if any row fails. Aligns with CLAUDE.md §14–15 and `UI-UX-SYSTEM.md`.

| # | Check | Pass criteria |
|---|-------|---------------|
| M1 | Breakpoints | Verify at **375**, **768**, and **1280** CSS px. Treat **768** as tablet: usable layout, no desktop-only overflow traps, touch-friendly controls. |
| M2 | No horizontal page scroll | Document/`html`/`body` and main shell content do **not** scroll horizontally at 375/768/1280. Nested intentional scroll OK (tables with internal overflow, kanban columns, **StatCardGrid** horizontal scroll inside its container). |
| M3 | Touch targets | Interactive controls are comfortably tappable on 375 (approx ≥44px height or adequate padding); no overlapping hit targets on primary actions. |
| M4 | Lone search / lone action | When the page has a **single** filter (typically search), it fills available width on mobile. When there is a **single** primary `actions` CTA, it is full-width on mobile (`PageWrapper` behavior). Multi-filter bars: search first; remaining filters collapse into a mobile **Drawer** where the product pattern applies. |
| M5 | Filters / menus → Drawer | On mobile (`< md`), filter/display/menu/multi-section panels that would be Popover or Sheet use a **Drawer** (e.g. `ResponsivePopover` or dedicated Drawer). Tiny 1–3 item menus and date pickers exempt. Desktop/tablet Popover/Sheet behavior may remain. |
| M6 | Sheets for filter/menu panels | Filter/menu **Sheets** follow mobile Drawer behavior (M5). Large form Sheets may stay Sheets if product pattern requires — note in evidence; still must not cause page-level horizontal scroll or obscured CTAs. |
| M7 | Module bottom tabs + FAB | When `MobileModuleBottomNav` / `MobileShellFab` are mounted: content has sufficient bottom padding so primary actions/empty states are not obscured; FAB does not permanently cover critical controls. |
| M8 | Chat conversation chrome | On `/chat/**` with an open conversation: module bottom tabs + FAB are suppressed appropriately; `ChatMobileBottomNav` / composer remain usable. Leaving the conversation restores expected shell. |
| M9 | Keyboard / safe-area | Focused inputs (especially chat composer, search, forms) remain usable with on-screen keyboard; bottom chrome respects safe-area insets where relevant (notched devices / home indicator). No permanently covered submit/send controls. |

**Evidence minimum (mobile):** screenshot at **375** of the page (and of any opened filter Drawer if the page has multi-filters). Note 768/1280 pass/fail in the ticket or evidence folder.

## Redirect-only routes

If the route file only `redirect(...)`s (e.g. `/billing/seats`, `/settings/subscription`):

- Do **not** run Phases 1–6 CRUD.
- Smoke: hit URL → lands on documented target; no console crash; ticket type/AC must say `redirect-smoke`.
- Still verify the **landing** view does not horizontally scroll at 375 (mobile smoke).

## Deferred / out-of-scope

Accounting customer invoicing (`/billing/invoices*`) is **not** platform Subscription QA (M2). Track as Accounting deferred unless an Accounting QA milestone opens. Mobile tickets for those routes stay `deferred` the same way.

## Evidence minimum

1. Denied-role screenshot or API 403 status  
2. One happy-path mutation HAR **or** screenshot after refresh (skip for redirect-smoke)  
3. Cross-tenant denial note (or N/A justification)  
4. **Mobile:** 375 screenshot (+ Drawer if applicable); 768/1280 noted as pass/fail
