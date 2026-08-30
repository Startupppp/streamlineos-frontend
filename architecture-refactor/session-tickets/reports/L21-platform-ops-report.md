# L21 — Platform Ops Report (audit-log · storage · activities · data-quality · public · portal · integrations)

## Fixes

- **storage**: cross-tenant file access returned 403 (existence oracle); fixed to 404. Same-org dedicated-access still 403. 5 tests updated.
- **public/recruitment.service.ts** (549 lines, hard-limit violation): split into `public-careers.service.ts`, `public-offers.service.ts`, `public-referrers.service.ts`. Source file deleted, module/controller updated.

## Isolation tests written

| File | Covers |
|---|---|
| `audit-log/audit-log-tenant-isolation.spec.ts` | `AuditLogService.list` + `listActions` |
| `integrations/core/integrations-tenant-isolation.spec.ts` | `IntegrationsService.listConnections` + `ownedConnection` |
| `activities/activities-tenant-isolation.spec.ts` | `ActivitiesService.participants` |
| `activities/my-tasks-tenant-isolation.spec.ts` | `MyTasksService.myTasks` |
| `data-quality/data-quality-tenant-isolation.spec.ts` | `DataQualityQueueService.getFinding` |
| `portal/access/portal-access-tenant-isolation.spec.ts` | `PortalAccessService.setMembershipStatus` |
| `public/public-careers-tenant-isolation.spec.ts` | `PublicCareersService.getOrgJob` + `listOrgJobs` |

`check:tenant-isolation`: 0 missing from all 7 owned trees.

## Out-of-ownership items

- Rate limit TIERS entries for 8 public/portal write endpoints (e.g. `applyToOrgJob`, `respondToOffer`, `registerExternalReferrer`) — `@UseRateLimit` keys need entries in `common/rate-limit.service.ts`.
- Malware/AV scan integration seam belongs in `common/security/`; storage quarantine hook is present but scan call is a stub.

## Validation

- `check:route-classification`: 0 undeclared
- `check:log-secrets`: OK
- `check:idempotent-commands`: OK
- `check:cycles`: 0 circular dependencies
- `check:tenant-isolation`: 0 missing in owned trees (298 total missing are other lanes)
- Jest (owned modules): 46 suites pass, 1 skip, 0 fail
