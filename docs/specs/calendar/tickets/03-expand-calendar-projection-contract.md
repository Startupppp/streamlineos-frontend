# 03: Expand the Calendar projection contract

**What to build:** Add a backward-compatible projection shape that gives every Calendar item stable identity, time meaning, source ownership, action capabilities, freshness, and completeness.

**Blocked by:** 01: Correct recurring occurrence windows and conflict checks.

**Status:** accepted

- [x] Each projection carries source key, source record ID, stable occurrence ID, status, time kind, availability behavior, source version, safe actions, and freshness.
- [x] Window responses distinguish complete, partial, failed, and continued results without removing the legacy fields during migration.
- [x] Timed instants and date-only commitments retain distinct semantics through the wire contract.
- [x] Unknown source kinds are preserved rather than coerced into a generic event category.
- [x] Contract tests cover Calendar-native, Build, Tasks, HR, attendance, and external-account projections.

