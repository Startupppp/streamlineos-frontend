# Orchestrator queue — work found but not yet dispatched

Written by the orchestrator so findings survive a process death. Delete a row once its lane has landed.

## RESOLVED

- **Q1 client-portal duplication** — NOT duplicates. The `(portal)` route serves external
  clients via a portal token and `portalApiClient`; the `(authenticated)` route serves
  internal users with a session JWT and `useCan("build:portal:view")`. The colliding
  `usePortalProjects` was renamed `useExternalPortalProjects`. Both kept.
- **Q2 `/settings/directory`** — moved to `/directory/settings/*`, old files deleted, no
  redirect, links and PAGES.md updated.
- **Q3 oversize portal detail page** — 479 -> 46 lines; body extracted to
  `features/portal/components/portal-project-detail.tsx`.
- **Q5 legacy-actor baseline** — re-emitted; 697 organizational FKs, `--check` shrink-only.

## OPEN — needs the user, do not guess

**`/directory/workers` universality.** Root `CLAUDE.md` §8 contains two sentences that
disagree: the universality list includes "people directory", while the route-ownership
rule places workforce at `/directory/workers` as organizational governance.

Current code follows the GATED reading (`directory:workers:view`, HR roles only). The
orchestrator deliberately kept the gated status quo: widening access is the unsafe
direction to guess wrong in. Changing to the universal reading means removing the nav
gate, the route-access extension, and three backend `@RequirePermission` guards in
`directory.controller.ts`.

## OPEN — long-horizon, not closeable in one pass

**S01 actor contraction (6 rows).** These describe a full multi-wave contraction across
~467 columns in 15+ modules: expand, backfill, validate, zero-use proof, cutover, drop.
Two tranches have shipped (5 build columns in 0690-0699, 6 timesheets columns in
0700/0701) and both were EXPAND only — no legacy column has been dropped. The rows that
depend on cutover cannot honestly be ticked until the drop wave runs. Do not let a lane
tick them on the strength of an expand.

**Malware scanning (S06, S07).** No scanner exists in this environment. Needs a ClamAV
sidecar, a cloud scan API, or an S3/Lambda quarantine pipeline, and the scan must gate
BEFORE the attachment row commits. Leave unticked; do not convert missing infrastructure
into a code-only claim.

## STANDING HAZARDS for future lanes

- The read-cost budget file holds its OWN hand-copied duplicate of each query. Optimizing
  a service does NOT change what the budget measures. Diff the two before trusting a number.
- Migration `when` values of 1798000000000+ pushed the applied watermark above every
  normally-numbered entry and stranded five migrations. The discipline gate now enforces
  monotonic `when`, unique `idx`, one file per numeric prefix, and a file per entry.
- Three lanes have now reported an "abandoned split": new files created and sometimes
  registered while the ORIGINAL still holds the code. Always re-check the original's line
  count, never just the new files' existence.
