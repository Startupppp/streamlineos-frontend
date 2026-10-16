# 05: Make native recurrence and export results complete and deterministic

**What to build:** Ensure dense native series and Calendar exports return stable occurrence-ordered results with honest continuation or partial coverage.

**Blocked by:** 03: Expand the Calendar projection contract.

**Status:** accepted

- [x] Old open-ended series cannot crowd a newer relevant occurrence out of the requested window without an incomplete result.
- [x] Native window ordering is deterministic by effective occurrence and stable identity.
- [x] Export orders all candidate occurrences before applying its row limit.
- [x] Dense windows and exports provide continuation or a clear partial-result recovery path.
- [x] Tests cover more than 400 series, a high-frequency series, moved exceptions, and an export where one series would otherwise consume the cap.

