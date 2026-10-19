# 12: Complete projection-contract migration and core verification

**What to build:** Move every Calendar source and consumer to the typed projection contract, remove the legacy generic metadata path, and verify the trustworthy core end to end.

**Blocked by:** 04: Enforce source-owner access and scoped identity; 05: Make native recurrence and export results complete and deterministic; 06: Make Build and Tasks projections bounded and deterministic; 07: Make attendance and HR coverage trustworthy; 08: Page connected Google and Outlook windows; 09: Refresh projections after source changes; 10: Use one authorized event set across every view; 11: Add durable History and Calendar URL state.

**Status:** accepted

- [x] All registered sources and UI consumers use stable typed identity, coverage, time, and action fields.
- [x] The legacy generic metadata interpretation is removed only after no caller depends on it.
- [x] Tenant, module, object-permission, archived/deleted record, dense data, and source-failure contracts pass.
- [x] Authenticated browser journeys pass at 375, 768, and 1280 px across two organizations and multiple connected accounts.
- [x] The release evidence clearly distinguishes source tests, browser behavior, provider sandbox behavior, and deployment status.

