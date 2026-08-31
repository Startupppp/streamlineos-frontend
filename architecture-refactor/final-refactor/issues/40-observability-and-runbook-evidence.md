# 40: Close observability and failure-runbook evidence

**What to build:** Operators can detect, diagnose and recover from queue, provider, tenant-context, latency and saturation failures across critical modules.

**Blocked by:** 20, 22, 23, 24, 25 and 38.

**Status:** in-progress — code and drills are proven; operator delivery remains open

- [x] Logs, metrics and traces carry safe release, cell, tenant, principal and correlation context.
- [x] Queue-age, pool-saturation and tenant-cost alert logic and self-tests pass.
- [x] Failure runbooks and safe dry-run/failure drills are recorded.
- [x] Alert transport has been observed end to end with a throwaway listener.
- [ ] Configure `ALERT_WEBHOOK_URL` so real alerts reach the on-call destination.
- [ ] Set `APP_RELEASE` in CI so deployed logs carry the release identifier.
- [ ] Provide a live production log stream for pool-saturation detection.
- [ ] Re-run the bad-release drill in the deployment runtime and record full propagation evidence.
- [ ] Add missing durable consumers for any stale outbox event types found by queue-age alerts.
