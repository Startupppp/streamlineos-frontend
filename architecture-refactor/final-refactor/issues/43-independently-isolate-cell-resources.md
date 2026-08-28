# 43: Provision independently isolated cell resources

**What to build:** At least two cells use independently provisioned database, cache, object storage, search, realtime, worker and monitoring resources so noisy-neighbor and failure isolation is real rather than namespace-only.

**Blocked by:** 42 and existing c28 issue 34.

**Status:** ready-for-agent

- [ ] Existing c28 issue 34 is completed and active-organization landing uses membership/index truth.
- [ ] Two cells use independent resource instances/accounts or an approved equivalent isolation boundary.
- [ ] Placement, cross-cell relay, organization relocation and rollback work with the isolated resources.
- [ ] Isolation verification proves one cell's resource outage/saturation does not consume the other's budget.
