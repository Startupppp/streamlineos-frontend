# 10 — Chat, Mail and Calendar get real permission vocabularies

**What to build:** These three modules have almost nothing to delegate. Chat exposes 21 routes against **4** permission keys; calendar has 3; mail has 4. A ladder over four keys exists but cannot express any distinction the product model requires — there is no way to say who may start a huddle, create a public channel, mint an invite link, or manage organisation-wide chat settings.

Author a real vocabulary for each, derived from the routes the module actually exposes.

**Every key must land together with the route gate that uses it.** A previous attempt produced 53 keys across eight modules, all of them grantable but gating nothing — a key that grants no capability is worse than no key, because it implies an authority that does not exist. If a capability has no route, it gets no key.

**Own-calendar access stays universal.** Only shared-calendar and organisation-wide event administration may be gated; a person's own calendar can never be taken away by a permission change.

**Blocked by:** 05 — Permission key grammar becomes a build failure

**Status:** DONE — every criterion verified 2026-08-21

- [x] Each new key is referenced by at least one route gate — no phantom keys
- [x] Chat can express channel, message, huddle, invite-link, pin and organisation-settings authority separately
- [x] A member's own calendar remains accessible with zero calendar grants
- [x] Existing keys are not renamed or removed; they are in live use and in stored grants
- [x] Each module's keys live in that module's catalog file
- [x] Role templates grant a sensible default set so the modules are usable on day one

---

## Validation — 2026-08-21

Every criterion above is ticked because it was verified individually, not because the work felt finished. Evidence, deviations and corrections are recorded in the commit that closed this ticket and in the `PAGES.md` changelog entry for 2026-08-21.

Highlights: six new keys, each paired to a real route AND asserted present in the catalog, because a key on a route but missing from the catalog is ungrantable and silently kills the route. Own-calendar was taken literally — the six caller-bound routes carry no gate at all, since a member default is revocable and the guarantee is not. Public-channel creation got **no** key: one handler also opens direct messages, so the capability has no route of its own. Migration `0437` backfills the member grants, without which every existing member would have lost huddles, pinning, invite links and calendar export on deploy.

This is done.
