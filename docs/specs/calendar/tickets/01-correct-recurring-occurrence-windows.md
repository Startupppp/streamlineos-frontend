# 01: Correct recurring occurrence windows and conflict checks

**What to build:** Make Calendar display, export, and conflict checking agree on which recurring occurrences overlap a requested window, including moved-in, moved-out, overnight, and multi-day occurrences.

**Blocked by:** None (can start immediately).

**Status:** accepted

- [x] An occurrence is included when its effective interval overlaps the requested half-open window, even if it starts before the window.
- [x] A moved occurrence appears once in its effective window and never in its former window while retaining stable occurrence identity.
- [x] Display, export, and conflict checking use the same occurrence-window semantics.
- [x] A conflict scan that reaches an expansion or candidate limit returns incomplete/unknown and never reports the slot as free.
- [x] Focused regression tests cover overnight recurrence, moved-in, moved-out, cancelled, DST, and dense-series cases.

