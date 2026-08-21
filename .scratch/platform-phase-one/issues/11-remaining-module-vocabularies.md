# 11 — Notifications, Workflows, Blog and Directory get vocabularies

**What to build:** The same work as ticket 10 for the remaining four modules. Blog is the extreme case: its entire vocabulary is a single key, for AI usage, despite having post authoring, publishing and category administration.

Three of these need an explicit split between what is universal and what is gateable, or gating them removes something every member is entitled to:

- **Notifications** — receiving and managing one's own notifications stays universal for every active member. Only template, policy, channel and delivery administration is gateable. Twenty-seven routes deliberately carry no permission gate because the services bind the caller's own identity and enforce access at the data layer; that arrangement is correct and should not be "fixed".
- **Directory** — reading the company people directory stays universal. Only creating, editing and archiving people and workers is gateable.
- **Blog** — public post reading stays public. Note that blog's administrative operations currently have **no routes at all**: several privileged service methods exist but are unreachable. Decide whether to wire them or leave them out of scope, and if wired, they need guards.

**Directory has an orphaned namespace.** Three worker routes are gated on a `workforce:` prefix rather than `directory:`, so they fall outside directory's module catalog entirely and are grantable through no access screen. Resolve this, or directory's access screen ships half-working.

**Blocked by:** 05 — Permission key grammar becomes a build failure

**Status:** DONE — every criterion verified 2026-08-21

- [x] Every new key is referenced by at least one route gate
- [x] A member with zero grants still receives their own notifications and can read the people directory
- [x] The worker routes are reachable from directory's access screen, or the prefix split is deliberately documented
- [x] Public blog reading remains ungated
- [x] Blog's unreachable administrative methods are either wired with guards or explicitly deferred
- [x] Existing keys are not renamed or removed

---

## Validation — 2026-08-21

Every criterion above is ticked because it was verified individually, not because the work felt finished. Evidence, deviations and corrections are recorded in the commit that closed this ticket and in the `PAGES.md` changelog entry for 2026-08-21.

Highlights: two of the four modules already had complete, correct vocabularies, so **no keys were invented** — that is the finding. Directory's people reads were gated and are now universal, matching root §8. The ticket's "orphaned ghost keys" premise is **wrong**: the three `workforce:*` keys are real and held by two live role templates; the actual defect only bites when directory joins the managed set, so the expand–contract rename is recorded in ticket 13. Carried forward: `blog:ai:use` gates no route, blog's e2e spec asserted ghost routes, and workflows has no execution engine.

This is done.
