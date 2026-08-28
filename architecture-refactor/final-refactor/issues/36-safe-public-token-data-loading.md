# 36: Move public-token reads to safe data-loading seams

**What to build:** Application-status, offer, referral and vendor-portal pages load through typed server/Query seams with rate-limited, isolated token access.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Effect-driven API reads are removed from all four audited pages.
- [ ] Public token validation, expiry, rate limiting and safe errors are preserved.
- [ ] Public responses never share authenticated tenant query caches.
- [ ] Effect-fetch check, typecheck and token success/failure tests pass.
