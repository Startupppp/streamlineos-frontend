# 28: Adopt route-access enforcement across modules

**What to build:** Build, Settings, Billing, Accounting, Support and Timesheets routes consistently enforce registry-defined access on direct navigation and in every navigation surface.

**Blocked by:** 27 — Build the shared server route-access registry.

**Status:** ready-for-agent

- [ ] Every in-scope administrative route declares registry access metadata.
- [ ] Legacy role checks and inconsistent client-only gates are removed.
- [ ] Universal routes remain accessible exactly as declared.
- [ ] Direct URL, navigation and action allow/deny tests pass.
