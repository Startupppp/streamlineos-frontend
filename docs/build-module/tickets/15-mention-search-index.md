# 15 — Make @mention resolution index-served

**What to build:** Typing a mention in a comment resolves the named person without scanning every member of the organisation. Each mention token currently produces two leading-wildcard text matches combined under `OR`, which no btree index can serve; with several mentions in one comment the predicate count multiplies against the full membership.

BE-49 forbids a leading-wildcard match: search through a text-search index or a trigram index instead. This ticket carries a migration, so the migration must be applied before the reading code ships — the backend deploys on every push, and code reading an index or column that does not exist yet fails in production.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Mention resolution no longer uses a leading-wildcard match
- [ ] The supporting index exists, is journalled, and has a rollback authored
- [ ] The migration is applied before the reading code can deploy
- [ ] Mentioning a person by partial name or email still resolves to the same person
- [ ] Resolution stays scoped to the organisation
