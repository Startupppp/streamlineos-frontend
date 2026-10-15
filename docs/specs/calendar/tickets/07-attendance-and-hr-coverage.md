# 07: Make attendance and HR coverage trustworthy

**What to build:** Represent attendance, WFH, and supplemental HR data with complete daily results and visible loading, denial, and failure states.

**Blocked by:** 03: Expand the Calendar projection contract.

**Status:** ready-for-agent

- [ ] More than 35 monthly attendance sessions do not silently omit later records or understate daily hours.
- [ ] Multiple sessions on one day are aggregated correctly by an authorized bounded query or complete pagination.
- [ ] Attendance, WFH, and supplemental HR request failures appear as partial coverage with retry instead of empty success.
- [ ] A prior 403 does not remain latched after the user changes organization or receives permission.
- [ ] Tests cover multi-session days, monthly overflow, failed month, failed WFH, organization switch, and permission restoration.

