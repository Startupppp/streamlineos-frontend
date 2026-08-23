# 10 — Removing a member takes effect on the same signal as removing a permission

**What to build:** Bring the membership access state cache into the access version keying.

The access caches are keyed by the organization's permissions version, so a bump makes every previous generation unreachable. The membership access state cache is the exception: it is keyed by organization and person only, so a version bump does not clear it and it serves the old answer for its own timer regardless of what changed.

That means suspending someone, removing them from an organization, or changing whether they are an owner or admin does not travel on the channel ticket 05 builds. It has its own, slower, unrelated window.

**Blocked by:** 05 — Access version channel.

**Status:** ready-for-agent
> **Status re-verified 2026-08-23: DONE.** Membership access state joined the access version keying (`496d0404`).


- [ ] Membership access state is keyed by the access version, or is cleared by the same bump.
- [ ] Suspending or removing a member is honoured within the same stated window as a permission change, on every instance.
- [ ] A change to whether someone is an owner or an organization admin travels on the same signal.
- [ ] A test publishes a bump and asserts membership state is re-read rather than served stale.
- [ ] The warm borrow count from ticket 01 has not increased.
- [ ] Membership changes already bust their own cache namespace; that path still works and is not duplicated.
