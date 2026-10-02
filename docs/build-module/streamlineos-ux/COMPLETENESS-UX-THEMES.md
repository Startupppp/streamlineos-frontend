# Completeness Wave — UX themes (Owner D-100…D-251)

1. **EmptyState contract** — nearly every More-tool uses New-* + empty copy; standardize illustration optional + one primary CTA.
2. **FilterBar system** — Status/Owner/Health/search/Display repeat across Projects/Products/Portfolios/Programs/Goals/Roadmap/Issues — consolidate tokens + chip UX.
3. **ViewSwitcher** — Issues Board/List/Table/Calendar/Timeline/Workload is a strength; Calendar IA exits Build to `/calendar` (document suite seam).
4. **More-tools density** — 20+ project tools; progressive disclosure / search (UX-010) still highest system risk after Freeze bugs.
5. **Loading → empty** — reports/approvals/meetings show loading then empty; prefer skeleton→empty within 1s to reduce perceived brokenness.
6. **Client portal** — unpublished + grant bugs block wedge (Freeze PM-001).
7. **Danger Zone** — present; confirm pattern for destructive (type-to-confirm) UNTESTED.

Next: merge Member `T-` ledger for role-differential UX (deny vs empty).

## Role-differential UX (Member T- vs Owner D-) — 2026-09-30

| Watch | UX ID | Friction | Design rec |
|-------|-------|----------|------------|
| CW-001 | UX-022 | Projects list / CC counts = 0 while project Member of `/build/47` | Membership-scoped list: show projects you’re on; never empty-all when ≥1 membership. Empty copy only when truly zero memberships. |
| CW-002 | UX-023 | No Create issue / Build create CTAs for Build Module Member | Either rename preset to **Viewer** or grant create-issue on Board/List. Create menu must include Issue when on project. |
| CW-003 | UX-018 | Client Access empty, no CTA | Request access / Contact admin (already in Freeze PM-001) |

**Severity:** UX-022 is trust/comprehension S1 (looks like data loss). UX-023 is collaborator activation S1 if “Member” means contribute.

**3 levels (CW-001):** Min = filter Projects to memberships; Coherent = badges “Member of” + CC counts match; Diff = personal home “My projects” default.
**3 levels (CW-002):** Min = + Create issue on project Issues; Coherent = Role label Viewer vs Member; Diff = permission-aware Create menu.
