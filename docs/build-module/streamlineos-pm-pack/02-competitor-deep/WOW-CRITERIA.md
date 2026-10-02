# WOW criteria — Aditya’s bar (StreamlineOS Build)
**Lane:** PM · **Updated:** 2026-10-01 (IST)
**Audience:** Aditya, council, Completeness prioritisation
**Companion:** `WOW-HAVE.md` · `SHIP-DESPERATE.md` · `100-WOW-REASONS-PM.md` · `ICP-ROADMAP-TOP15.md`
**Authoritative pack (SoT):** `../../streamlineos-analysis-pack/01-ci/competitor-deep/100-WOW-REASONS.md` + `HAVE-TODAY.md` — PM files are ICP overlays only; do not invent a parallel fluff bank.
**Non-goal:** Pad to 100 with fluff. Honest shortfall > invented wow.

---

## 1. Aditya’s bar (valid reasons only)

A reason belongs in the WOW programme only if it is **one** of:

| Type | Definition | Sellable when |
| --- | --- | --- |
| **(A) HAVE** | A **wow** capability Build **already ships** that **competitors mostly lack** (not just “we also have a board”). Must be evidence-backed from Completeness / QA / UX / CI gap register. | **Today** — only if QA/Owner VERIFIED and CI does not force BEHIND |
| **(B) SHIP** | A capability **desperately needed** by Freelancer (F) / Product Manager (PM) / Project Manager (PjM); becomes a sellable reason **once implemented**. Prefer gaps vs **UI-VERIFIED** Directs (ClickUp / Linear / Jira filters) + prior Freeze / Completeness IDs. | **When shipped** — never claim as HAVE early |

**Freeze order stays:** PM-011 → PM-002 → PM-001. No Freeze swell without Aditya.

---

## 2. INVALID (rejected — do not list as WOW)

Aditya rejected these as fluff / non-reasons. They must **not** appear as HAVE or SHIP rows:

| Invalid class | Examples | Why invalid |
| --- | --- | --- |
| **All-in-one / suite sprawl pitch** | “One OS for everything”, “more modules than ClickUp”, Mega-menu feature count | Positioning fluff; Design AVOID sprawl (CW-006) |
| **Cheaper / pricing alone** | “Lower price than Jira/ClickUp” | Not a product wow; not evidence-backed Completeness gap |
| **Modern UI / prettier chrome** | “Cleaner than Jira”, “looks modern” | Taste claim; no Completeness/QA ID |
| **Invented competitor UI** | Fields/operators not in CI `FEATURES.md` dumps | Forbidden — cite walk or `PUBLIC:` only |
| **Premature UNIQUE** | “Client portal UNIQUE vs Linear” while grant→guest BEHIND | CI: UNIQUE-vs-Linear **LOW until guest NF** |
| **Empty shell as wow** | Roadmap / Goals / Wiki / Whiteboard empty tabs | Empty + Direct AVAILABLE = BEHIND craft, not HAVE |
| **AI / JQL as Now table-stakes** | Linear AI filter, Jira JQL-class language | Walk-confirmed on Directs — still **AVOID Now / AVOID chase** (`FILTERS.md` #113–114) |
| **Ops niche Freeze swell** | Xray/Zephyr/JSM SLA depth | Not Now until wedge works |
| **PARITY marketed as wow** | Multi-view board, Epic↔issue link, filter chips | Protect strengths — not wow differentiation |

---

## 3. HAVE rules (ruthless)

| Must | Must not |
| --- | --- |
| Cite Build evidence ID (BUG / UX / CW / PM / D- / T- / census MD) | Invent a feature Build does not ship |
| Show **competitors mostly lack** it (CI AHEAD/UNIQUE vs ≥2 Directs, or UNIQUE wedge with working path) | Call AHEAD-vs-Linear-only a general “wow HAVE” without saying vs whom |
| Prefer **filled workflow VERIFIED** over named shell | Count empty Approvals inbox / empty Portfolio as HAVE wow |
| Short list OK — **zero true HAVE is allowed** | Pad with PARITY or suite slogans |

### Near-HAVE (allowed in `WOW-HAVE.md`, tagged clearly)

- **AHEAD surface** with create-path VERIFIED but lifecycle / membership / guest NF still UNKNOWN or BEHIND craft.
- **UNIQUE-potential chrome** that exists in Build but cannot be sold until DoD ships (e.g. portal chrome before PM-001).

Near-HAVE is **not** marketing copy. It is a protect / finish list.

---

## 4. SHIP rules (desperate only)

| Must | Must not |
| --- | --- |
| Name **who hurts** (F / PM / PjM job blocked today) | List every CI hypothesis as desperate |
| Cite competitor proof: prefer CI `FEATURES.md` / `BUILD-GAPS.md` for **UI-VERIFIED** filters; else Completeness ID or `PUBLIC:<product>:<page>` | Invent walk grammar |
| Name Build **gap ID** (BUG / UX / CW / PM / UX-026…) | Ship without a ledger hook |
| State **sellable reason WHEN SHIPPED** (en-GB customer voice) | Claim sellable today |
| Assign priority: **Freeze** / **Completeness Next** / **Later** / **Not Now** | Put Later/Not Now items above Freeze |
| Prefer gaps vs UI-VERIFIED Directs + Freeze/Completeness prior art | Chase Premium Plans scenarios / Whiteboard |

**Desperation test:** Would a F/PM/PjM trial fail or churn this week without it? If no → Later or drop from WOW SHIP.

---

## 5. Status vocabulary (UNIQUE / PARITY / BEHIND)

| Label | Meaning for WOW programme |
| --- | --- |
| **UNIQUE** | Build has a working capability Directs mostly lack — **HAVE** only after guest/NF or filled craft VERIFIED + CI ack |
| **UNIQUE-potential** | Strategy bet (usually client portal) — **not HAVE** until path works |
| **AHEAD (surface)** | Named surface / create chrome ahead of a named Direct (often Linear) — **near-HAVE** at best; craft may still be BEHIND others |
| **PARITY** | Match Direct table stakes — **Protect not Wow** |
| **PARITY-seeking** | Partial match; keep/finish — **Protect not Wow** |
| **BEHIND** | Gap — candidate **SHIP** if desperate |
| **BEHIND craft** | Shell/partial exists — SHIP to fill, not HAVE |
| **Not Now** | Park — must not swell Freeze |

---

## 6. Evidence tiers (same hygiene as `FILTERS.md`)

| Tier | Use in WOW rows |
| --- | --- |
| Completeness / Freeze / UX / QA IDs | Primary for Build gap + HAVE |
| CI UI-VERIFIED `clickup|linear|jira/FEATURES.md` | Preferred competitor proof for filters |
| CI gap register AHEAD/UNIQUE calls | HAVE / near-HAVE vs-whom |
| `PUBLIC:<product>:<page>` | SHIP competitor proof pending walk — mark pending |
| Marketing blogs / memory | Forbidden |

---

## 7. Relationship to other artefacts

| Artefact | Role |
| --- | --- |
| CI `100-REASONS.md` | Seed + hypothesis inventory — **not** WOW-bar compliant; fold gaps into SHIP, do not copy fluff |
| `PM-OWNED-REASONS.md` (115) | Full framing stock (includes PARITY / Later / Not Now) — broader than WOW |
| `WOW-HAVE.md` | Ruthless HAVE + near-HAVE + Protect |
| `SHIP-DESPERATE.md` | Ranked desperate SHIP only |
| `100-WOW-REASONS-PM.md` | Thin ICP overlay on CI pack (120 already meets bar) |
| `ICP-ROADMAP-TOP15.md` | CI Top 15 × JTBD × Freeze/Next/Later |
| CI `100-WOW-REASONS.md` / `HAVE-TODAY.md` | **Authoritative** HAVE/SHIP master |

---

## 8. Freeze protection (repeat)

| Allowed | Forbidden without Aditya |
| --- | --- |
| Rank SHIP under Completeness Next / Later | Add CW-### into Freeze Now |
| Finish PM-011 → 002 → 001 first | Soften PM-001 DoD to chrome-only |
| Protect client-portal wedge in Next | Chase JSM feature count to “match” portal |
