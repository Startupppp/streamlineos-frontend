# 12 — Require the concurrency token on ticket update

**What to build:** Two people editing the same ticket cannot silently overwrite each other. The compare-and-swap that prevents it is already written, correct and tested — but the token that triggers it is optional, so any caller that omits it skips the check entirely and the later write wins with no signal. Make the token required, and return enough in the conflict response for the caller to resolve.

This is the contract half of the sequence. It is a breaking change for any caller not yet echoing the token, which is why ticket 11 lands first.

**Blocked by:** 11 — Return the concurrency token everywhere, and have clients echo it.

**Status:** ready-for-agent

- [ ] A ticket update without a concurrency token is rejected, not silently applied
- [ ] A stale token returns 409 and the response carries the current value so the caller can refresh
- [ ] Two concurrent updates from the same starting state produce one success and one 409
- [ ] The negative case is paired with a positive assertion, per BE-141
