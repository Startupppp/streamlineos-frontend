# 35: Consolidate formatters and page states

**What to build:** Money/date/number formatting and empty/loading/error states use organization-aware shared primitives consistently across in-scope modules.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Local formatters migrate to canonical organization-aware helpers or documented valid exceptions.
- [ ] Hand-written empty states migrate to shared states or documented specialized exceptions.
- [ ] Currency, locale, filtered-empty, loading and retry behavior remain correct.
- [ ] Formatter and empty-state structural checks pass.
