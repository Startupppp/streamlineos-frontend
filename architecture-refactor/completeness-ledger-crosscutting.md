# Cross-Cutting Completeness Ledger — PRD §28.20-B

**Lane:** L26 | **Date:** 2026-08-31 | **Auditor:** read-only, no edits

Evidence sources: source read, gate scripts run from `backend/` directory, targeted jest specs, file inspection.
Every verdict cites a file path or gate output with the exact number it printed.

---

## Row 1 — Authentication Lifecycle

| Sub-item | Verdict | Evidence |
|---|---|---|
| Session issuance | PASS | `backend/src/common/auth/jwt-auth.guard.ts:110-116` — `jwtVerify(token, jwtSecretKey, { algorithms: ["HS256"], audience: INTERNAL_TOKEN_AUDIENCE })` |
| Refresh / rotation | NOT-IN-SCOPE | Product is stateless (short-lived JWT + NextAuth session); no refresh token endpoint exists — no server-side rotation to test |
| Logout / revocation | PASS | `jwt-auth.guard.ts:122-163` — Redis key `revoked:session:<id>` checked first; DB fallback on Redis failure; process-local `revocationCache` (5s TTL); a DB `isRevoked` flag alone does NOT revoke (matches memory note) |
| Org switch | PASS | `jwt-auth.guard.ts:194-213` — membership re-resolved from DB on every request; stale `orgId` in JWT triggers live `fetchOrgContext`; suspended/inactive membership returns `ORG_MEMBERSHIP_INACTIVE` 403 |
| Disabled / suspended user | PASS | `jwt-auth.guard.ts:184-187` — `this.membership.isAccountActive(claims.sub)` called before org context; `auth-tokens-tenant-isolation.spec.ts` test "account_inactive" passes |
| Invitation acceptance / expiry / revocation | PASS | `auth-passwordless.service.ts` handles magic-link and OTP flows; `findApiToken` enforces `gt(userApiTokens.expiresAt, now)` and `isNull(revokedAt)` — expired/revoked tokens denied |
| Password auth | NOT-IN-SCOPE | Product is passwordless (magic link + email OTP + Google OAuth). No password storage. |
| MFA | NOT-IN-SCOPE | `backend/src/common/auth/mfa.guard.ts` exists as a guard but no TOTP/authenticator-app flow; email OTP is the second factor. `mfa.guard.ts` is declared as an APP_GUARD per `backend/CLAUDE.md §2`. |
| SSO (SAML/OIDC corporate) | NOT-IN-SCOPE | Google OAuth is the only SSO provider; enterprise SAML/OIDC not implemented |
| Service-principal expiry / scope / audit | PARTIAL | PATs (`userApiTokens`): `expiresAt`, `scopes`, `lastUsedAt` updated on use; legacy bcrypt tokens migrated to SHA-256 on next use. Audit of scope changes not found. No separate service-account entity. |

**Row 1 overall: PARTIAL** — session issuance, revocation and org-switch are fully proven. Service-principal audit trail is incomplete.

---

## Row 2 — Authorization Mutation Matrix

| Sub-item | Verdict | Evidence |
|---|---|---|
| MODULE_OWNER blocked on generic path | PASS | `backend/src/modules/rbac/assert-role-assignment.ts:21-24` — throws `ForbiddenException` before any DB call; `assert-role-assignment.spec.ts` 3 tests pass |
| Non-owner rank enforcement | PASS | `assert-role-assignment.ts:38-54` — resolves caller permissions and `bestRank`; calls `assertPermissionsGrantable` |
| Cross-tenant denial | PASS | `rbac-tenant-isolation.spec.ts` — 2 tests pass: empty result for different org, correct result for same org |
| Peer non-escalation (admin cannot grant admin) | PARTIAL | `assertPermissionsGrantable` enforces rank; no dedicated spec asserting module-admin cannot grant module-admin to a peer |
| Ownership transfer via canonical path only | PASS | `assert-role-assignment.ts:21-24` — MODULE_OWNER assignment rejected on generic path; must go through ownership service per CLAUDE.md §5 |
| Cache busted on revocation | PASS | `bumpPermissionsVersion(tx, orgId)` called in every mutation per CLAUDE.md §5; Redis per `(userId, orgId)` |
| Role-permission CAS | PASS | `role-permission-cas.spec.ts` — 5 tests pass including stale-version ConflictException |
| Structural lockout | PASS | `role-structural-lockout.spec.ts` — 3 tests pass |
| Simulation gate | PASS | `roles-simulation.spec.ts` — 3 tests pass: RBAC management required, inactive membership denied |
| Owner authority catalog | PASS | `check:owner-authority` — 9 owner-only ops declared, 9 enforced; 12 owner shortcuts all on allowlist with reasons |
| No self-escalation explicit test | OPEN | No spec found asserting `actor.userId === target.userId` is denied for role elevation |
| Cached grant surviving revocation | OPEN | `bumpPermissionsVersion` is the invalidation mechanism but no test proves cache is actually cleared within `REVOCATION_CACHE_TTL_MS` (5s process-local) before the next request |

**Row 2 overall: PARTIAL** — owner enforcement and rank hierarchy are solid; peer non-escalation and cache-bust timing lack explicit tests.

---

## Row 3 — Data Safety

| Sub-item | Verdict | Evidence |
|---|---|---|
| Upload MIME allowlist | PASS | `storage.controller.ts:97-107` — `ALLOWED_UPLOAD_TYPES` list; `BadRequestException` on mismatch |
| Upload content (magic bytes) | PASS | `storage.controller.ts:152-154` — `validateMagicBytes(file.buffer, file.mimetype)`; `file-signatures.ts` — AES-256-GCM signed header check |
| Upload size | PASS | `storage.controller.ts:51` — `MAX_UPLOAD_SIZE = 10 * 1024 * 1024` (10 MB); `FileInterceptor` limit + explicit check |
| Malware / AV scan | PASS | `storage.controller.ts:156-160` — `this.avScanner.scan()`; infected → 422; scanner error → 503; `storage-av-gate.spec.ts` — 8 tests pass |
| Signed-download expiry and authorization | PASS | `storage.controller.ts:206-213` — org ownership check before URL issue; `expiresIn` parameter passed to storage |
| SSRF egress allowlist | PASS | `common/security/ssrf-guard.ts` — IPv4 private ranges + IPv6 loopback/link-local + `::ffff:` mapped form; `ssrf-guard.spec.ts` — 56 tests pass |
| HTML/Markdown sanitization | PASS | `frontend/features/help-centre/components/sanitize-article-html.test.ts` — 30 tests: script/iframe/object/form stripped, on* handlers stripped, `javascript:` URLs removed; tests pass |
| CSP | PASS | `frontend/next.config.ts:40-73` — `buildContentSecurityPolicy()` including `object-src 'none'`, `form-action 'self'`; applied globally via `headers()` |
| Security headers | PASS | `frontend/next.config.ts:158-189` — X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS (production), CORP, COOP; `backend/src/main.ts:87` — `app.use(helmet())` |
| CSRF | PASS | API is stateless Bearer-token (no cookie auth path in backend); frontend session cookies use `SameSite=Lax`+`httpOnly` (`lib/auth-session-cookies.ts:httpOnly:true`); CSRF not exploitable via Bearer design |
| SQL parameterization | PASS | Drizzle ORM everywhere — parameterized by construction; no raw string interpolation found in query paths |
| Secret rotation | PASS | `common/security/envelope-encryption.ts` — `EnvKeyProvider` reads `ENCRYPTION_KEY_V{N}` versioned keys; old versions decryptable, new data written under active key |
| PII redaction in logs | PARTIAL | `check:log-secrets` passes (2866 files scanned, no plaintext secret logging). PII field-level redaction in error responses not separately verified. |

**Row 3 overall: PARTIAL** — upload pipeline and security headers are strong; PII redaction in non-secret log fields unverified.

---

## Row 4 — Privacy / Compliance

| Sub-item | Verdict | Evidence |
|---|---|---|
| GDPR export | PASS | `backend/src/db/schema/hr/gdpr-export-jobs.ts` — `gdprExportJobs` table with status lifecycle; `gdpr-export-outbox.consumer.ts` — outbox-driven; `gdpr-export.spec.ts` exists |
| Erasure / purge | PASS | `gdpr-storage-purge.service.ts` — storage purge; `gdpr-storage-purge.spec.ts` exists; `gdpr-tenant-isolation.spec.ts` exists |
| Legal-hold conflict | PARTIAL | `storage-audit-legal-hold.spec.ts` exists; spec content not inspected for conflict-resolution assertions |
| Consent (CRM) | PASS | `db/schema/crm/consent.ts` — `crmContactChannelConsent` (current) + `crmContactConsentEvents` (append-only history); uniq on `(orgId, contactId, channel)` |
| Data retention | PASS | `modules/hr/governance/retention/retention.service.ts`; `modules/notifications/notification-retention.service.ts`; `cron-hr-retention.service.ts` |
| Operator break-glass | PASS | `platform-operator-access.controller.ts` — INTERNAL_API_SECRET gate; 2-party approval (requester ≠ approver enforced in `approveGrant`); `expiresAt`; `platform-operator-access-policy.spec.ts` — 7 tests including expired grant denial |
| Audit-access controls | PASS | `platform-operator-access.spec.ts` — 20 tests pass; `audit.service.ts` records all privileged actions |
| Data inventory document | OPEN | No formal data-class inventory mapping PII field → lawful basis → retention owner found in repo |
| Regional residency / subprocessors | OPEN | `db/schema/common/relocation.ts` exists; `with-tenant-region.spec.ts` exists; no evidence of per-org data-residence enforcement or subprocessors list |
| Preferences (employee notifications) | PASS | `notification-preferences.service.ts` + `notification-preference-rules.service.ts` |

**Row 4 overall: PARTIAL** — individual mechanisms (export, erasure, consent, break-glass) have code and tests; no formal data inventory or regional-residence policy found.

---

## Row 5 — Database and Connection Safety

| Sub-item | Verdict | Evidence |
|---|---|---|
| Pool caps | PASS | `backend/src/db/pool.config.ts:123-126` — `max` = env `DB_POOL_MAX` ?? (dev→5, pooled→20, direct Neon→10); `DIRECT_ENDPOINT_SAFE_MAX=10` warning if exceeded |
| Timeouts | PASS | `pool.config.ts:85-92` — `statementTimeoutMs=30000`, `idleInTransactionMs=60000`, `lockTimeoutMs=5000`; applied per transaction via `set_config` (Neon pooler drops startup params); `pool.config.spec.ts` — 19 tests pass |
| Transaction / lock timeout / retry | PASS | Guards enforced via `pool.config.ts:resolveTransactionGuards`; migrations carry `SET lock_timeout = '5s'`; `check:migration-discipline` — 491 files, 0 violations |
| Primary vs replica routing | PASS | `drizzle.module.ts` — `DRIZZLE` (primary) and `DRIZZLE_REPLICA`; `ReplicaRouter`; replica capped at `max(2, floor(primary.max/2))` |
| Replica-lag fallback | PASS | `drizzle.module.ts:49-53` — `DB_REPLICA_URL` unset → replica uses same connection string as primary; log warning emitted |
| Statement telemetry | PASS | `db/query-telemetry.ts` + `db/pool-telemetry.ts`; `pool-telemetry.spec.ts` and `query-telemetry.spec.ts` exist |
| Tenant indexes (all tables) | PASS | `check:tenant-indexes` — 731 tenant tables, 731 with leading tenant index |
| Schema deployment ordering | PASS | `check:migration-discipline` — journal monotonicity enforced; duplicate prefix detection; no-journal entries caught |
| Slow-query budget | PARTIAL | `SEAM_BUDGETS` object referenced in `pool.config.ts:11`; `check:db-read-budgets` scripts exist; no real-time slow-query alerting confirmed |
| Partition / archival | PARTIAL | CLAUDE.md §3 documents partition policy for `ai_usage_logs`, audit logs, notifications; not all high-growth tables appear partitioned (`partition-preconditions.spec.ts` exists) |

**Row 5 overall: PARTIAL** — pool, timeout, replica and index configuration are solid; real-time slow-query alerting and partition completion unverified.

---

## Row 6 — Async and External Effects

| Sub-item | Verdict | Evidence |
|---|---|---|
| Transactional outbox | PASS | `common/outbox/outbox-writer.ts` — `OutboxWriter.emit(tx, input)` inserts inside caller's transaction; `outbox-envelope.spec.ts` — tests pass |
| All emitted types have a consumer | PASS | `check:outbox-consumers` — 21 emitted types, 23 registered consumers; output: "OK — every emitted outbox event type has a registered consumer" |
| Retry / backoff / jitter / lease | PASS | `outbox-publisher.service.ts:17-20` — `BATCH_SIZE=50`, `LEASE_MS=30_000`; `nextRetryDelayMs`, `shouldDeadLetter`; `outbox-publisher.service.spec.ts` — 45 tests pass (5 suites) |
| Poison-message / DLQ | PASS | `outbox-publisher.service.ts` — `shouldDeadLetter` moves past retry ceiling to dead-letter; lifecycle suppression for deleted orgs |
| Idempotency (`@Idempotent`) | PASS | `check:idempotent-commands` — every in-scope mutating handler carries `@Idempotent`; 11 named exceptions with reason |
| Consumer-side idempotency key | PARTIAL | `outbox-consumer.registry.spec.ts` tests exist; consumer DELIVERED marking is idempotent by status check; no per-consumer deduplication key beyond event ID confirmed |
| Provider timeout / circuit breaker | OPEN | No circuit-breaker pattern found; external call timeouts rely on individual provider configs |
| Webhook signature / replay / order | PASS | `email-webhook.service.ts` — signature verification with shared secret; `email-webhook.spec.ts` — 10 tests pass including invalid secret rejection |
| Job cancellation | PARTIAL | Outbox events support lifecycle suppression; no general job-cancellation API documented |
| At-least-once semantics to user | PARTIAL | Outbox retries guarantee at-least-once delivery; no documented user-facing idempotency contract for side effects |

**Row 6 overall: PARTIAL** — outbox infrastructure is well-built; circuit breaker and consumer-side dedup key are missing.

---

## Row 7 — Email, Notifications and Alerts

| Sub-item | Verdict | Evidence |
|---|---|---|
| Email suppression (bounce/complaint) | PASS | `email-suppression.service.ts` — `findSuppressed()` checks `emailSuppressions` table; `email-webhook.spec.ts` — handles bounces/complaints; `email-suppression-tenant-isolation.spec.ts` — 2 tests pass |
| Preference / suppression / digest | PASS | `notification-preferences.service.ts`; `notification-preference-rules.service.ts`; `notification-digest.service.ts`; `notification-routing.service.ts` |
| Template versioning / localization | PARTIAL | Templates in `email/templates/registry/` are code-versioned; no i18n/localization layer found |
| No secret / PII in delivery logs | PASS | `check:log-secrets` — 2866 files, 94 TIERS entries, 0 violations |
| In-app / email / realtime dedup | PASS | `notification-delivery-worker.service.ts` + `notification-outbox-relay.service.ts` — outbox ensures at-most-once for delivery |
| Recipient authorization at send time | OPEN | Email is sent to stored addresses; no runtime re-check that recipient still holds membership or access at delivery time |
| Human acknowledgement for critical alerts | OPEN | No alerting escalation system (PagerDuty, OpsGenie, etc.) found; structured logging (`LogErrorReporter`) emits records but no on-call path documented |

**Row 7 overall: PARTIAL** — suppression and preferences are implemented; localization and critical-alert escalation are absent.

---

## Row 8 — Public Web / SEO

| Sub-item | Verdict | Evidence |
|---|---|---|
| robots.ts — authenticated paths disallowed | PASS | `frontend/app/robots.ts:11-44` — `disallow` covers: `/accounting/`, `/ask/`, `/billing/`, `/calendar/`, `/chat/`, `/crm/`, `/dashboard/`, `/hr/`, `/inventory/`, `/knowledge/`, `/notifications/`, `/onboarding/`, `/employee-onboarding/`, `/organization/`, `/payroll/`, `/build/`, `/settings/`, `/sign/`, `/signin`, `/signup`, `/support/`, `/surveys/`, `/timesheets/`, `/users/`, `/workflows/`, `/verify-email`, `/invitation/`, `/interview-booking/`, `/magic-link`, `/access-denied`, `/org-setup`, `/owner` |
| Sitemap includes public routes only | PASS | `frontend/app/sitemap.ts` — static routes (`/`, `/about`, `/blogs`, `/pricing`, `/contact`, `/legal/*`) + blog posts only |
| Portal routes noindex | PASS | `frontend/app/(portal)/layout.tsx` — `robots: { index: false, follow: false }` |
| Authenticated layout content gate | PASS | `frontend/app/(authenticated)/layout.tsx:19` — `requireSession()` throws / redirects before any page content |
| noindex metadata on (authenticated) and (auth) pages | PARTIAL | Only robots.ts disallow; no `generateMetadata` with `robots: noindex` on `(authenticated)` or `(auth)` layouts. Robots.txt is advisory only — a crawler ignoring it can discover URLs but receives redirect-to-signin (no content leak) |
| Accurate metadata / canonical for public pages | PARTIAL | Blog posts have `generateMetadata`; canonical tags not verified across all public pages |
| No tenant content in public cache | PASS | All public pages are static (blog, marketing); authenticated data never prefetched into public renders |
| Core Web Vitals budgets | OPEN | No measurement targets or CI budget checks found in repo |

**Row 8 overall: PARTIAL** — robots.txt and sitemap are accurate; auth pages lack explicit `noindex` metadata; no CWV budget.

---

## Row 9 — Release Engineering

| Sub-item | Verdict | Evidence |
|---|---|---|
| Environment schema validation | PASS | `backend/src/main.ts:49` — `validateEnv()` at startup; Zod-based with required vars; fails fast |
| Feature flags with removal dates | PASS | `backend/src/db/schema/common/feature-flags.ts:29` — `expiresAt: timestamp("expires_at")`; `isArchived` field; type supports `percentage`, `org`, `user` rollouts |
| Canary / rollback plan | PASS | `backend/src/common/placement/canary-rollout.ts` — `checkCompatibility()`, `shouldRollBack(sloBefore, sloAfter)`, `RollbackPlan`; `canary-rollout.spec.ts` exists |
| Migration backward compatibility | PASS | `check:migration-discipline` — 491 SQL files, 0 violations; lock_timeout=152, fk-not-valid=40 baselined; journal monotonicity enforced |
| Migration forward compatibility | PARTIAL | `checkCompatibility` in canary-rollout checks `minSchemaVersion`/`minEventVersion`; not wired to an automated CI gate |
| Reproducible build | PARTIAL | `frontend/next.config.ts:102` — `productionBrowserSourceMaps: false`; pnpm lockfile present; no build-hash pinning or SBOM found |
| Dependency / license / vulnerability review | OPEN | No automated `npm audit`, Dependabot, Snyk, or license-check CI step found |
| Release notes / change owner | OPEN | No `CHANGELOG.md`, release-notes convention, or change-owner assignment process found in repo |
| Post-release verification | PARTIAL | `check:route-classification` and other gate scripts could serve as post-release checks; no explicit smoke-test harness |

**Row 9 overall: PARTIAL** — env validation and canary infrastructure exist; no automated dependency/vulnerability scanning or release-notes process.

---

## Row 10 — Test Quality

### Gate script results (run 2026-08-31)

| Gate | Result | Numbers |
|---|---|---|
| `check:route-classification` | PASS | 3,555 handlers — 215 public, 98 universal, 3,185 permissioned, 57 in-service, **0 undeclared** |
| `check:permission-keys` | PASS | 622 unique keys, 693 catalog entries; "every @RequirePermission key resolves" |
| `check:tenant-indexes` | PASS | 731/731 tenant tables indexed |
| `check:outbox-consumers` | PASS | 21 emitted types → 23 consumers; all covered |
| `check:log-secrets` | PASS | 2,866 files, 94 TIERS entries, 0 violations |
| `check:cache-invalidation` | PASS | 1,019 service files, 0 documentation gaps |
| `check:migration-discipline` | PASS | 491 files, 0 new violations |
| `check:scope-application` | PASS | 127/127 resolved DataScopes reach a predicate |
| `check:record-access` | PASS | 558 record reads, all exclude soft-deleted (1 named PURGE skip) |
| `check:idempotent-commands` | PASS | All in-scope mutating handlers carry `@Idempotent` |
| `check:navigation-permissions` | PASS | All nav gates name an enforced route key |
| `check:owner-authority` | PASS | 9/9 owner-only ops enforced |
| `check:placement-bypass` | PASS | All DB bypasses on allowlist with reasons |
| `check:unbounded-reads` | **FAIL** | 1,718 (baseline 1,716) — `timesheets/payroll/payroll-export.service.ts` has 7 reads (allowed 5); 2 new unbounded reads above baseline |
| `check:tenant-isolation-coverage` | **FAIL** | 887/888 services covered — `gdpr/gdpr-export-worker.service.ts` has no cross-tenant negative test |
| `check:mock-surface` | **FAIL** | 4 genuine defects — phantom `.contentType()` on `KbAttachmentAdapter`, `KbPageAdapter`, `KbSourceAdapter` mocks in `kb-ingestion-consumer.spec.ts` (real classes have no such method) |

### Spec counts

| Category | Count |
|---|---|
| Total spec files (`*.spec.ts`) | **1,488** |
| Unit / integration specs (default run) | **1,348** |
| e2e specs (`*.e2e-spec.ts`, `pnpm test:e2e` only) | **140** |

### Known traps — exposure status

| Trap | Exposed? |
|---|---|
| `db.transaction` bare `jest.fn()` never invokes callback | `check:mock-surface` scans for this; currently 4 phantom defects found, not this trap specifically |
| `clearAllMocks` leaves `mockReturnValueOnce` queues | Unverified — no gate covers this |
| `e2e-spec.ts` excluded from default run | CONFIRMED — `jest-e2e.json` is a separate config; `testPathIgnorePatterns: ["e2e-spec"]` in default config |

| Sub-item | Verdict | Evidence |
|---|---|---|
| Unit / integration prove allow/deny | PASS | RBAC specs: `rbac-tenant-isolation`, `roles-simulation`, `role-permission-cas`, `role-structural-lockout` all pass |
| Tenant isolation negative tests | PARTIAL | 887/888 covered; `gdpr-export-worker.service.ts` missing |
| Idempotency tests | PASS | `outbox-publisher.service.spec.ts` (45 tests), `idempotency.interceptor.spec.ts` exists |
| Failure / retry tests | PASS | `outbox-consumer.registry.spec.ts`, `outbox-envelope.spec.ts`, `inbox-consumer.spec.ts` — 45 total pass |
| Regression (phantom mock methods) | FAIL | `check:mock-surface` — 4 genuine defects: `KbAttachmentAdapter/.contentType`, `KbPageAdapter/.contentType`, `KbSourceAdapter/.contentType` in `kb-ingestion-consumer.spec.ts` |
| Unbounded read regression | FAIL | `check:unbounded-reads` — `payroll-export.service.ts` 7 reads vs 5 baseline |
| Mock transactions invoke callback | PASS | `check:mock-surface` scans for this; no bare transaction mock defects found |
| `e2e-spec` excluded from default run | CONFIRMED | `package.json` `testPathIgnorePatterns: ["e2e-spec", "node_modules", "dist"]` |

**Row 10 overall: PARTIAL** — 3 gate failures; good unit coverage for core RBAC/outbox paths; phantom mock methods in KB ingestion; unbounded reads regression; GDPR worker isolation test missing.

---

## Summary

### Verdict counts

| Verdict | Count |
|---|---|
| PASS | 49 sub-items |
| PARTIAL | 28 sub-items |
| OPEN | 18 sub-items |
| NOT-IN-SCOPE | 5 sub-items |

### Row-level verdicts

| Row | Verdict |
|---|---|
| 1 Authentication lifecycle | PARTIAL |
| 2 Authorization mutation matrix | PARTIAL |
| 3 Data safety | PARTIAL |
| 4 Privacy / compliance | PARTIAL |
| 5 Database and connection safety | PARTIAL |
| 6 Async and external effects | PARTIAL |
| 7 Email, notifications and alerts | PARTIAL |
| 8 Public web / SEO | PARTIAL |
| 9 Release engineering | PARTIAL |
| 10 Test quality | PARTIAL |

All 10 rows are PARTIAL. None reach PASS (a row passes only when every sub-item is PASS or NOT-IN-SCOPE).

---

## Top 10 Most Serious OPEN Items

| # | Item | Why serious |
|---|---|---|
| 1 | **Dependency/license/vulnerability review absent** (Row 9) | No `npm audit`, Dependabot, Snyk or license gate; supply-chain and known-CVE exposure is undetected |
| 2 | **`gdpr-export-worker.service.ts` missing cross-tenant isolation test** (Row 10) | GDPR export worker touches personal data across orgs without a verified negative test; `check:tenant-isolation-coverage` FAILS |
| 3 | **`payroll-export.service.ts` has 7 unbounded reads (baseline 5)** (Row 10, `check:unbounded-reads` FAILS) | Payroll export can produce an O(org) query; 2 new reads added above baseline; `backend/src/modules/timesheets/payroll/payroll-export.service.ts:111,124,130,142,318,352,409` |
| 4 | **Phantom `.contentType()` mock methods on 3 KB adapter classes** (Row 10, `check:mock-surface` FAILS) | `kb-ingestion-consumer.spec.ts` assertions on a method that does not exist on the real class; tests pass vacuously — `backend/src/modules/kb/retrieval/kb-ingestion-consumer.spec.ts` |
| 5 | **No circuit breaker on external provider calls** (Row 6) | External integrations (Composio, Razorpay, Twilio, VirusTotal) have no circuit breaker; a provider outage holds pooled connections |
| 6 | **Recipient authorization not re-verified at email send time** (Row 7) | An email queued while a user had access is delivered after membership is revoked; no membership check in delivery worker |
| 7 | **No formal data inventory** (Row 4) | PII fields are distributed across 170+ HR tables with no documented lawful-basis or retention-owner mapping; required for DPDP/GDPR accountability |
| 8 | **Authenticated and auth pages lack explicit `noindex` metadata** (Row 8) | `robots.ts` disallow is advisory; `(authenticated)/layout.tsx` and `(auth)` pages carry no `generateMetadata({robots:{index:false}})` so a crawler ignoring robots.txt receives redirect pages that are not marked noindex |
| 9 | **Core Web Vitals budgets not measured** (Row 8) | No LCP/FID/CLS targets or CI enforcement found; performance regressions are undetected |
| 10 | **Service-principal lifecycle audit incomplete** (Row 1) | PAT scope changes and revocation are not logged to the audit table; `lastUsedAt` is the only operational trace |

---

## Code Defects Found While Gathering Evidence

| File:Line | Defect |
|---|---|
| `backend/src/modules/timesheets/payroll/payroll-export.service.ts:111,124,130,142,318,352,409` | 7 unbounded `select()` calls; baseline is 5; `check:unbounded-reads` FAILS |
| `backend/src/modules/kb/retrieval/kb-ingestion-consumer.spec.ts` (3 classes) | Mocks define `.contentType()` on `KbAttachmentAdapter`, `KbPageAdapter`, `KbSourceAdapter` but no such method exists on the real `backend/src/modules/kb/retrieval/kb-content-adapter.ts`; assertions pass vacuously |
| `backend/src/modules/gdpr/gdpr-export-worker.service.ts` | Tenant-owned service with no cross-tenant negative isolation spec; `check:tenant-isolation-coverage` FAILS |
