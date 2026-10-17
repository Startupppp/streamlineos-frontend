# FIX-LIST: Manage Product (QA run 2026-10-13)

Totals: Critical 2 · High 5 · Medium 8 · Low 12 (incl. 1 needs-recheck) = 27. Full details: CLAUDE-FIX-BRIEF.md.

## Critical
1. MP-B-013 — New release always fails (400: optional fields sent as null, QA state "None"); silent. [G3]
2. MP-B-023 — Overview crashes once a release exists (summary `previews.releases` contract mismatch). [G4]

## High
3. MP-B-002 — Capture feedback fails silently (402, Feedbucket off); CTA shown when module off. [G3]
4. MP-B-008 — Insights State filter doesn't toggle; one click crashed Insights. [G7]
5. MP-B-009 — Double-click "Create Item" duplicates roadmap items. [G2]
6. MP-B-011 — New Goal: raw "e.items is not iterable", sheet stays open → duplicates. [G1/G2/G3]
7. MP-B-014 — Roadmap item with >200-char title can't be saved; raw zod toast. [G5]

## Medium
8. MP-B-001 — Product directory not refreshed after create. [G1]
9. MP-B-003 — Non-numeric Baseline → 500. [G3]
10. MP-B-005 — Negative override accepted by UI; 400 not shown. [G3]
11. MP-B-010 — Accepted opportunity RICE ≠ roadmap item RICE (impact mapping, override lost).
12. MP-B-015 — Removing last product Admin is a silent no-op. [G3]
13. MP-B-017 — Roadmap items not openable by keyboard (a11y). [G7]
14. MP-B-018 — Member sees goal count but empty list (summary not permission-filtered). [G6]
15. MP-B-024 — Posted product update never shown on Overview. [G1/G4]

## Low
16. MP-B-004 — Opportunity title uncapped; table overflow. [G5]
17. MP-B-006 — Slow score/override/accept; Accept form stays open. [G2]
18. MP-B-007 — `?opportunity=` deep link doesn't reopen sheet.
19. MP-B-012 — Total Goals tile stale after unlink. [G1]
20. MP-B-016 — Linked projects stale after link; no primary badge. [G1]
21. MP-B-019 — Member sees New Goal; raw permission-key toast. [G6/G3]
22. MP-B-020 — Outsider gets error boundary on /roadmap, /releases. [G6]
23. MP-B-021 — Outsider sees CTAs/tiles on not-found product pages. [G6]
24. MP-B-022 — Admin goal create: list/tiles stale. [G1]
25. MP-B-025 — Removed member lingers in list. [G1]
26. MP-B-026 — Evidence "Approval state: Not set" vs QA state.
27. MP-B-027 — Feedback error boundary at 300% zoom — **NEEDS RECHECK** after MP-B-002.

Groups: G1 stale lists/invalidation · G2 double-submit · G3 raw/silent errors · G4 summary schema · G5 title 200 · G6 not-found/denied/RBAC consistency · G7 keyboard a11y.
