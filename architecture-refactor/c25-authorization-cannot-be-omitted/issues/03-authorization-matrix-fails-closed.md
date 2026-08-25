# 03 — The authorization matrix fails closed in CI

**Status:** ready-for-agent

## Acceptance criteria

- [ ] CI enumerates every route and fails on missing exposure metadata.
- [ ] Permission keys on routes exist in the backend and frontend catalogs.
- [ ] Every non-universal navigation destination names the exact route permission.
- [ ] Every tenant table approved for RLS has a policy and a leading tenant index.
- [ ] Permission mutations bump the access version in the same transaction.
- [ ] The report names intentional exceptions rather than hiding them in a broad allowlist.

## Todo

- [ ] Join route, catalog, navigation and RLS checks into one report
- [ ] Make each missing classification actionable by file and route
- [ ] Wire the report as a required CI check
