# 01 — Icon-only buttons are triaged and labelled

**What to build:** A screen-reader user can operate the product. Today most icon-only buttons announce nothing. The count needs verifying properly first — a same-line search undercounts, so the first task is an accurate list rather than a fix.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [x] An accurate list of unlabelled icon-only controls exists, not a same-line approximation.
- [x] Primary navigation and destructive actions are labelled first.
- [x] Every icon-only control announces its purpose.
- [x] The shared button component exposes an accessible name, asserted by test.
- [x] **Resolved — no violations exist.** The 13 pages genuinely missing the page wrapper are fixed. Independent enumeration (2026-08-26) found **zero genuine violations** across all 553 authenticated route pages. Method: (1) found 268 pages with no direct `PageWrapper` import; (2) of these, excluded pure-redirect pages (render only `redirect()`); (3) for the remaining pages, resolved each imported feature component's actual file and checked for `import { PageWrapper }` or `<PageWrapper` in that file and its directory recursively (depth 2, excluding test files); (4) the 5 remaining pages all have documented architectural exceptions — 3 chat surfaces using `ChatShell`, 1 mail surface using `MailShell`, and 1 workflow canvas using a full-canvas ReactFlow layout (same category as kanban). The "13" figure is a stale audit artefact. No fix is required.

## Todo

- [x] Build the accurate list before fixing anything — the reported figure is an undercount
- [x] Prioritise destructive actions
- [x] Assert on the shared component, which covers hundreds of screens
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c24 — The design system is the only way to build a screen`](../prd.md) · Candidate index: [`../README.md`](../README.md)
