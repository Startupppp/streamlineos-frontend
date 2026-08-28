# 40: Close observability and failure-runbook evidence

**What to build:** Operators can detect, diagnose and recover from queue, provider, tenant-context, latency and saturation failures across critical modules.

**Blocked by:** 20, 22, 23, 24, 25 and 38.

**Status:** ready-for-agent

- [ ] Logs/metrics/traces carry safe release, cell, tenant, principal and correlation context.
- [ ] Queue age, retries, dead letters, signatures, latency, pool saturation and tenant cost alert below SLO breach.
- [ ] Runbooks exercise provider outage, queue backlog, cache loss, database/cell failure and bad release.
- [ ] Test alerts and failure drills produce recorded operator evidence without exposing secrets.
