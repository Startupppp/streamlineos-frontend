# 14 — Onboarding reaches first value

**Status:** done, surface deliberately unmounted — the endpoint and checklist exist and were verified live; the dashboard already carries a getting-started checklist and reconciling the two is a product decision, recorded below.
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

---

## Notes

### The definition

*Activated* = the workspace holds the tenant's own data **and** somebody has done
something with it. Data alone is an import nobody looked at; activity alone is
somebody clicking around a demo. Requiring both is what makes it measure
adoption rather than effort. It is pure, so it can be argued with and changed in
one place.

### Wiring it found the same thing ticket 07 found

The definition was written and left with no caller. `ActivationService` now
gathers the signals in one statement — six round trips on a surface somebody is
waiting for is a visible pause — and `GET /onboarding/activation` serves it.

Two signals are narrower than the obvious query, and deliberately: an import
that was later **reverted** did not leave the tenant's data in the workspace,
and a channel **configured but never used** is a setting rather than a signal.
Counting either would report first value that nobody has had.

Not permission-gated beyond being signed in. Gating it would hide the checklist
from exactly the person most likely to finish it — the colleague invited to come
and do the setting up.

### Verified, then deliberately unmounted

The checklist was confirmed rendering against the live endpoint on a real
tenant: 0%, the server's own prompt (*"Import your customers, so the trial
reflects your business rather than a sample."*), steps in the order worth doing
them.

It is **not** mounted. The dashboard already carries a "Getting Started"
checklist, and two checklists on one screen is worse than either. That one is
not a naive click-tracker — it derives from real signals too — but it fires five
separate queries per dashboard load and its thresholds are `> 0`, so one lead
ticks "Create your first record" where activation wants ten.

Both definitions are defensible. Choosing between them **changes what existing
tenants see** — a workspace showing 4/5 today may show 3/5 — and that is a
product decision about which definition of "started" the company runs on, not a
refactor to make quietly. The shape if activation wins: keep the existing
widget's chrome and replace `use-workspace-checklist-progress.ts` with this
endpoint for the three items that map, which also drops five queries to three.
