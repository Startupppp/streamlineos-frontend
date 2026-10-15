# 10: Use one authorized event set across every view

**What to build:** Make Grid, List, History, and mobile derive from one authorized projection set with consistent source filters, overlap rules, coverage, and actions.

**Blocked by:** 03: Expand the Calendar projection contract; 07: Make attendance and HR coverage trustworthy; 08: Page connected Google and Outlook windows.

**Status:** accepted

- [x] The same enabled sources and authorized occurrence identities appear in every applicable view.
- [x] HR, CRM, attendance, and connected-account filters act on canonical source families rather than frontend-only overlays.
- [x] Overnight and multi-day items use interval overlap in List and Grid.
- [x] Mobile rows are interactive and open the same permitted detail, RSVP, edit, and source actions as desktop.
- [x] Loading, failed, partial, denied, disabled, and genuinely empty states remain distinguishable at 375, 768, and 1280 px.

