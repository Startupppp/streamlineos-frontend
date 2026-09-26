# 11 — Return the concurrency token everywhere, and have clients echo it

**What to build:** Every Build entity that supports concurrent editing returns its concurrency token in its response, and every first-party client sends that token back on the next write. This is the expand half of an expand–contract sequence: nothing is enforced yet, so no caller breaks.

Context worth knowing, because the module's own notes record the opposite: ticket update **already implements a correct compare-and-swap** — it guards the write on the row's current version and increments it, returning 409 through a dedicated conflict exception, with a passing spec. The recorded cross-cutting gap claiming no optimistic concurrency exists anywhere reached that conclusion by searching for `If-Match` and `ETag` headers, and this codebase carries the token in the request body, so that search could not have found it. Treat the mechanism as present and correct, not missing.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Every mutable Build entity's read response carries its current concurrency token
- [ ] Every first-party client sends the token it last read on update
- [ ] Nothing rejects a request for omitting the token yet
- [ ] The existing ticket conflict behaviour is unchanged
