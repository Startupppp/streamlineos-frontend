# 11 — Notifications, Workflows, Blog and Directory get vocabularies

**What to build:** The same work as ticket 10 for the remaining four modules. Blog is the extreme case: its entire vocabulary is a single key, for AI usage, despite having post authoring, publishing and category administration.

Three of these need an explicit split between what is universal and what is gateable, or gating them removes something every member is entitled to:

- **Notifications** — receiving and managing one's own notifications stays universal for every active member. Only template, policy, channel and delivery administration is gateable. Twenty-seven routes deliberately carry no permission gate because the services bind the caller's own identity and enforce access at the data layer; that arrangement is correct and should not be "fixed".
- **Directory** — reading the company people directory stays universal. Only creating, editing and archiving people and workers is gateable.
- **Blog** — public post reading stays public. Note that blog's administrative operations currently have **no routes at all**: several privileged service methods exist but are unreachable. Decide whether to wire them or leave them out of scope, and if wired, they need guards.

**Directory has an orphaned namespace.** Three worker routes are gated on a `workforce:` prefix rather than `directory:`, so they fall outside directory's module catalog entirely and are grantable through no access screen. Resolve this, or directory's access screen ships half-working.

**Blocked by:** 05 — Permission key grammar becomes a build failure

**Status:** ready-for-agent

- [ ] Every new key is referenced by at least one route gate
- [ ] A member with zero grants still receives their own notifications and can read the people directory
- [ ] The worker routes are reachable from directory's access screen, or the prefix split is deliberately documented
- [ ] Public blog reading remains ungated
- [ ] Blog's unreachable administrative methods are either wired with guards or explicitly deferred
- [ ] Existing keys are not renamed or removed
