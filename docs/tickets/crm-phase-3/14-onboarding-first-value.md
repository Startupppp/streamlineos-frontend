# 14 — Onboarding reaches first value

**Status:** definition and instrumentation done; the surface is frontend work.
**Track:** D — funnel
**Blocked by:** 13

## Why

A trial that reflects a sample rather than the prospect's own business does not
convert. The Phase 2 importer is part of onboarding, not a settings page they
never find.

## Acceptance criteria

- [ ] The importer is reachable from onboarding, not only from settings.
- [ ] A prospect can bring their existing data in during the trial.
- [ ] The measure — workspaces with real data in them — is instrumented.
- [ ] Skipping the import is durable and never re-prompted, per the existing wizard rule.

## Notes (2026-08-26)

The PRD says the funnel's measure is **workspaces with real data in them**, not
signups. That needed to be a definition somebody can argue with rather than a
flag somebody sets, so it is pure and lives in one place.

**A workspace is activated when it holds the tenant's own data *and* somebody has
done something with it.** Data alone is an import nobody looked at — counting it
would make the funnel report success for a trial that went quiet the day it
started. Activity alone is somebody clicking around a demo. Requiring both is
what makes this a measure of adoption rather than of effort.

An import counts however few rows it brought: the tenant did the work of pointing
us at their data, and penalising a small business for being small would make the
measure mean something other than what it says. Hand-entered parties count past a
threshold that separates a book of business from the two rows somebody made while
exploring.

Steps are ordered by what is worth doing, not by what is listed — data first,
because a colleague invited into an empty workspace sees an empty workspace.

**Still open:** the onboarding surface that renders it, and reading the signals
from live counts. The definition is the part that decides whether the number
means anything.