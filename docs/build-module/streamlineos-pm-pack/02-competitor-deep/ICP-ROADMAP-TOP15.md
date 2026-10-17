# ICP roadmap — Top 15 SHIP (CI SoT + PM JTBD overlay)
**Lane:** PM · **Updated:** 2026-10-01 (IST)
**Source of truth:** `../../streamlineos-analysis-pack/01-ci/competitor-deep/100-WOW-REASONS.md` → section **Top 15 SHIP** (rows #3, #1, #2, #6, #12, #7, #23, #24, #9, #13, #31, #8, #10, #46, #21)
**Do not invent a parallel Top 15.** This file maps CI ranks → Freelancer / Product Manager / Project Manager JTBD + Freeze / Completeness Next / Later.
**Freeze implement order unchanged:** **PM-011 → PM-002 → PM-001** (even when CI desperation ranks client grant above invite — eng still ships invite path first).

**ICP JTBD SoT:** `ICP-JTBD.md`

---

## Priority legend

| Bucket | Meaning |
| --- | --- |
| **Freeze** | Eng Now only — PM-011 / PM-002 / PM-001 (+ grant loader/request bugs tied to PM-001) |
| **Completeness Next** | Post-Freeze Completeness wave |
| **Later** | After Next craft; may need auth/plan depth |

---

## Top 15 — ICP map

| CI rank | CI # | Feature | Priority | Primary ICP | JTBD (who hurts) | Sellable reason WHEN SHIPPED (en-GB) | Evidence (CI) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **3** | Client grant → guest magic-link | **Freeze** (PM-001) | **F, PjM** | F JTBD2 / PjM client share — wedge dead without real guest entry | Granting a client creates a real guest magic-link entry — never a false-success toast | PM-001 · BUG-005/006 · CLIENT-PORTAL-CHROME |
| 2 | **1** | Cold invite accept → Build | **Freeze** (PM-011) | **F, PM, PjM** | All: invite teammate → useful workspace — blank/OTP roulette kills trial | Cold invite accept lands you reliably in Build — no blank shell or OTP roulette | BUG-001 · PM-011 |
| 3 | **2** | Invite grants Build module access | **Freeze** (PM-002) | **F, PM, PjM** | All: teammate can open `/build` without Roles chase | Invites grant Build access automatically — no manual Roles chase after accept | BUG-002 · PM-002 |
| 4 | **6** | Grant Access projects loader | **Freeze** (with PM-001) | **F, PjM** | F/PjM: finish client grant — loader Error blocks wedge before guest starts | Grant Access loads projects reliably so owners can finish the grant | BUG-006 · CLIENT-PORTAL-CHROME |
| 5 | **12** | Labels / Tags filter (UX-026) | **Completeness Next** | **F, PM, PjM** | F: tag client work · PM: feature slices · PjM: shared lenses | Filter issues by Labels from the Issues FilterBar — ADAPT Tags naming for freelancers | UX-026 · FILTERS · Linear Labels + ClickUp Tags **UI-VERIFIED** |
| 6 | **7** | Active / Current cycle chrome (UX-024) | **Completeness Next** | **PM** | PM JTBD1: plan & track the current cycle — link exists, chrome missing | Active/Current cycle chrome on overview and board so “this cycle” is obvious | UX-024 · CW-004 · Linear Cycles REPORTED |
| 7 | **23** | Default Member can create issues | **Completeness Next** | **PM, PjM** | PM JTBD4: ICs contribute day one — “Member” must mean create | Default Member can create issues in projects they can access | CW-002 · Member T24 · UX-023 |
| 8 | **24** | Membership-scoped Projects list (UX-022) | **Completeness Next** | **PM, PjM** | PM/PjM: find my work — “No projects” while on a project looks like data loss | Projects list and Command Center counts match membership reality | CW-001 · UX-022 · T01/T02 |
| 9 | **9** | Release ↔ issue membership (UX-025) | **Completeness Next** | **PM, PjM** | PM JTBD3 / PjM ship: “what’s in the release?” unambiguous | Release membership and ship tracking so the ship set is clear | UX-025 · EPIC-RELEASE-LINK-DEPTH · Jira **Affects versions filter UI-VERIFIED**; Releases/Versions surface unavailable in observed free team-managed space |
| 10 | **13** | Epic *relation* filter (UX-027) | **Completeness Next** | **PM, PjM** | PM/PjM: slice everything in epic X — Type=Epic is not enough | Filter issues by Epic relation — not only Type = Epic | UX-027 · Linear Relations→Parent **UI-VERIFIED** |
| 11 | **31** | Named saved filters / Custom Views | **Completeness Next** | **PM, PjM** (+F) | PM/PjM: reopen the same planning lens; F: reuse client filters | Named saved filters (personal + shared) so teams reopen the same lens | FILTERS · ClickUp/Linear/Jira Save **UI-VERIFIED** |
| 12 | **8** | Triage empty → usable ritual (UX-029) | **Completeness Next** | **PM** | PM JTBD2: process new work — accept/decline/snooze, not a dead panel | Triage goes from empty panel to a usable intake ritual | UX-029 · Linear Triage REPORTED |
| 13 | **10** | Program ↔ project membership (UX-028) | **Completeness Next** | **PjM** | PjM: programme rollup — nest-only shells are not containers | Programs hold real project membership — not nest-only shells | UX-028 · PROGRAM-PROJECT-LINK |
| 14 | **46** | Public Form URL for client intake | **Completeness Next** | **F, PjM** | F JTBD intake / PjM structured inbound — no full seat for submitter | Shareable public Form URL for structured intake outside the workspace | FORMS-AUTOMATIONS · PUBLIC forms · UX-032 adjacent |
| 15 | **21** | Password + SSO alongside OTP | **Later** | **F, PM, PjM** | All: return tomorrow without OTP ritual pain — trust table-stakes | Sign-in with password and SSO options — not OTP-only fragility | CI-060 · CI Cut auth |

---

## Eng path (Aditya — implement order)

| Step | What | Why |
| --- | --- | --- |
| **1** | **PM-011** (CI #1) | Freeze #1 — cold invite |
| **2** | **PM-002** (CI #2) | Freeze #2 — Build module access |
| **3** | **PM-001** + BUG-006/004 (CI #3 + #6 + request CTA) | Freeze #3 — guest wedge + grant loader |
| **4** | Completeness Next filters/trust pack | CI ranks 5–14: Labels → cycle chrome → Member honesty → Release → Epic filter → saved filters → Triage → Program membership → public Form |
| **5** | Later auth | CI rank 15: password + SSO (do **not** swell Freeze) |

**Note:** CI Top 15 ranks **client grant** as desperation #1; **Freeze eng order** still ships **invite accept → Build role → client grant**. Do not reorder Freeze without Aditya.

**Jira free-tier caveat:** UX-025 is a Build membership-truth target. The Jira walk verified only the **Affects versions** filter; Releases/Versions and Components routes bounced in the observed team-managed space. UX-028 remains a real Program ↔ project membership JTBD, but Jira `/jira/plans` was an empty **No plans yet** shell, not evidence of a full Plans/programme surface. Do not use either route observation to swell or reorder Freeze.

---

## By ICP (primary emphasis)

| ICP | CI ranks (primary) | Positioning when shipped |
| --- | --- | --- |
| **Freelancer** | 1, 2, 3, 4, 5, 14 (+15 Later) | Client-ready projects: real guest portal + Labels/Tags + public Form — not ClickUp mega-menu |
| **Product Manager** | 2, 3, 5, 6, 7, 8, 9, 10, 11, 12 (+15 Later) | Activation + cycle honesty + role truth + Labels/Epic/saved lenses + Triage — match Linear jobs without cloning visual ID |
| **Project Manager** | 1, 2, 3, 4, 5, 7–11, 13, 14 (+15 Later) | Guest trust + programme membership + Release ship-set + shared filters — suite delivery without JSM feature chase |

---

## Filters Completeness Next top-8 (CI) — where they sit vs Top 15

CI Filters top-8 are all **SHIP** (see `100-WOW-REASONS.md`). Intersection with Top 15:

| Filters top-8 | In Top 15? | CI # |
| --- | --- | --- |
| Labels / Tags | **Yes** rank 5 | #12 |
| Epic relation | **Yes** rank 10 | #13 |
| Release / version filter | Via Release membership rank 9; filter facet = CI #27 (Next after membership); Jira **Affects versions** filter UI-VERIFIED, not a Releases page | #9 / #27 |
| Named saved filters | **Yes** rank 11 | #31 |
| Operators is/is not/empty | Next after Top 15 core | #28 |
| AND/OR nest | Next after Top 15 core | #29 |
| Relative due presets | Next after Top 15 core | #30 |
| Me / Me Mode | Next after Top 15 core | #32 |

---

## Explicit non-claims

- Do not market Client Portal as UNIQUE HAVE until CI #3 ships and guest NF VERIFIED (HAVE-conditional #105).
- Do not treat CI Top 15 password/SSO as Freeze.
- Do not pad with all-in-one / cheaper / modern UI.
- Protect filter chips + URL (CI #100) while shipping Labels/Epic — PARITY, not wow HAVE.
