# 26: Publish scoped scheduling APIs and signed webhooks

**What to build:** Provide a versioned developer surface for availability, booking, lifecycle events, embeds, replay, and deletion.

**Blocked by:** 17: Publish versioned Calendar lifecycle events; 23: Ship secure branded and embedded booking.

**Status:** ready-for-agent

- [ ] Tenant credentials and user grants expose only documented least-privilege scopes.
- [ ] Reads are paginated and rate limited; writes require idempotency and current versions.
- [ ] Webhooks are signed, timestamped, versioned, replay protected, retryable, and minimized for subscriber access.
- [ ] Compatibility, deprecation, deletion, replay, and failed-delivery behavior is documented and tested.
- [ ] Wrong tenant, revoked token, stale version, invalid signature, replay, and excessive rate fail closed.

