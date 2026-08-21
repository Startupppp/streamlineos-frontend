# 10 — Chat, Mail and Calendar get real permission vocabularies

**What to build:** These three modules have almost nothing to delegate. Chat exposes 21 routes against **4** permission keys; calendar has 3; mail has 4. A ladder over four keys exists but cannot express any distinction the product model requires — there is no way to say who may start a huddle, create a public channel, mint an invite link, or manage organisation-wide chat settings.

Author a real vocabulary for each, derived from the routes the module actually exposes.

**Every key must land together with the route gate that uses it.** A previous attempt produced 53 keys across eight modules, all of them grantable but gating nothing — a key that grants no capability is worse than no key, because it implies an authority that does not exist. If a capability has no route, it gets no key.

**Own-calendar access stays universal.** Only shared-calendar and organisation-wide event administration may be gated; a person's own calendar can never be taken away by a permission change.

**Blocked by:** 05 — Permission key grammar becomes a build failure

**Status:** ready-for-agent

- [ ] Each new key is referenced by at least one route gate — no phantom keys
- [ ] Chat can express channel, message, huddle, invite-link, pin and organisation-settings authority separately
- [ ] A member's own calendar remains accessible with zero calendar grants
- [ ] Existing keys are not renamed or removed; they are in live use and in stored grants
- [ ] Each module's keys live in that module's catalog file
- [ ] Role templates grant a sensible default set so the modules are usable on day one
