# SEC1 — Cross-Tenant Sweep Report

**Date:** 2026-08-30  
**Lane:** SEC1  
**Scope:** inventory, support, surveys, hr, crm, deals, leads, contacts, quotes, invoices, e-sign, storage, integrations, notifications, platform, ownership, party, directory, goals, issues

---

## Summary

Swept all in-scope modules for the six cross-tenant hole patterns from the mission brief. Found and fixed **five real tenancy holes** across two modules (storage and e-sign). All 23 tests pass.

---

## Finding 1 — CRITICAL: storage.controller.ts — Membership lookup without orgId scope

**Files:** `src/modules/storage/storage.controller.ts` (lines 180–183, 225–228 before fix)

**The hole:**  
Both the `download` and `image` endpoints called `organizationMembers.findFirst({ where: eq(organizationMembers.userId, u.userId) })` without scoping to `u.orgId`. A user who belongs to multiple organizations could receive the membership row from a different org (whichever the DB returns first). The `orgId` used for file ownership checks was then derived from that wrong membership row rather than the JWT's `u.orgId`.

Attack: Authenticated as org-A. DB returns org-B membership first. File belongs to org-B. Check: `fileOwner.orgId ("org-B") !== orgId ("org-B")` → false → file served. Cross-tenant file access.

**Root cause:** Redundant membership re-fetch that ignored the authenticated `u.orgId` from the JWT. `JwtAuthGuard` already validates active membership for `u.orgId`; the re-fetch was dead weight that introduced ambiguity for multi-org users.

**Fix:** Removed the `organizationMembers.findFirst` calls in both endpoints. Both now use `u.orgId` directly (the JWT-validated org). Also removed the now-unused `eq` import and `organizationMembers` schema import.

**Test (biting):** `storage.controller.spec.ts` — "DENY — JWT org governs file access: org-A actor cannot access org-B expense receipt even if membership lookup would return org-B". Mock sets `organizationMembers.findFirst` to return `{ orgId: "org-B" }` while user JWT has `orgId: "org-A"` and file belongs to `org-B`. Old code: serves the file. New code: throws NotFoundException. Control test: same-org file download succeeds.

---

## Finding 2 — MODERATE: e-sign DELETE operations without orgId (TOCTOU)

**Pattern:** Each service validates resource ownership via a `get(orgId, id)` read, then executes a DELETE with only `eq(table.id, id)` in the WHERE clause — no `orgId`. A concurrent race window exists between the read and the write.

### 2a. sign-documents.service.ts:141

`await this.db.delete(signDocuments).where(eq(signDocuments.id, documentId));`

**Fix:** `where(and(eq(signDocuments.id, documentId), eq(signDocuments.orgId, orgId)))`

### 2b. sign-fields.service.ts:133

`await this.db.delete(signFields).where(eq(signFields.id, fieldId));`

**Fix:** `where(and(eq(signFields.id, fieldId), eq(signFields.orgId, orgId)))`

### 2c. sign-recipients.service.ts:128

`await this.db.delete(signRecipients).where(eq(signRecipients.id, recipientId));`

**Fix:** `where(and(eq(signRecipients.id, recipientId), eq(signRecipients.orgId, orgId)))`

### 2d. sign-watermark.service.ts:62 (UPDATE) and :77 (DELETE)

UPDATE: `.where(eq(signWatermarkPolicies.id, id))` — no orgId.  
DELETE: `.where(eq(signWatermarkPolicies.id, id))` — no orgId.

**Fix (UPDATE):** `.where(and(eq(signWatermarkPolicies.id, id), eq(signWatermarkPolicies.orgId, orgId)))`  
**Fix (DELETE):** `.where(and(eq(signWatermarkPolicies.id, id), eq(signWatermarkPolicies.orgId, orgId)))`

**Tests:** `src/modules/e-sign/__tests__/esign-delete-tenant-isolation.spec.ts` — 10 tests covering all four services: each has a DENY case (cross-org id throws NotFoundException) and a CONTROL case (WHERE clause captures orgId via sqlValues AST inspection). The `sqlValues` extractor walks the Drizzle AST without `JSON.stringify` (circular). `db.transaction` is not used in any of these paths.

---

## Findings Not Made

**inventory:** All `findFirst`/`update`/`delete` calls are tenant-scoped.  
**support:** Ticket helpers use `orgId` consistently. Global `users` lookups are for display name/email from the JWT actor — not cross-tenant.  
**surveys:** Public survey response sessions use `app.resolve_survey_session_org_id()` (a PostgreSQL security-definer function) to establish org context; unscoped session lookup is intentional for anonymous respondents.  
**crm/deals/leads bulk ops:** All properly scoped via `orgId` in WHERE. `updateMirroredLeads` / `softDeleteMirroredLeads` both include `eq(leads.orgId, organizationId)`.  
**notifications bulkDelete:** Scoped by both `orgId` and `userId`.  
**goals/issues:** All reads and writes include `orgId`.  
**contacts `mergeContacts`:** The `ForbiddenException` for `primary.orgId !== orgId` is dead code (the prior `mergeCandidate(orgId, id)` already scopes by orgId, so this branch is unreachable). Not a security hole.  
**`assertMember` (user-profile/user-activity):** Status not checked, but these are admin-side lookups of org-scoped users; the `orgId` tenant boundary is enforced. Not a cross-tenant hole; data-lifecycle question deferred.  

---

## Files Changed

| File | Change |
|---|---|
| `src/modules/storage/storage.controller.ts` | Remove `organizationMembers.findFirst` calls; use `u.orgId` directly; remove `eq`/`organizationMembers` imports |
| `src/modules/e-sign/sign-documents.service.ts` | Add `eq(signDocuments.orgId, orgId)` to DELETE WHERE |
| `src/modules/e-sign/sign-fields.service.ts` | Add `eq(signFields.orgId, orgId)` to DELETE WHERE |
| `src/modules/e-sign/sign-recipients.service.ts` | Add `eq(signRecipients.orgId, orgId)` to DELETE WHERE |
| `src/modules/e-sign/sign-watermark.service.ts` | Add `eq(signWatermarkPolicies.orgId, orgId)` to UPDATE and DELETE WHERE |
| `src/modules/storage/storage.controller.spec.ts` | Add 2 new tests (DENY + ALLOW for multi-org membership bypass); remove stale `organizationMembers` mock |
| `src/modules/e-sign/__tests__/esign-delete-tenant-isolation.spec.ts` | New file — 10 tests across 5 describe blocks |

---

## Test Results

```
PASS src/modules/storage/storage.controller.spec.ts
  13 tests — 13 passed

PASS src/modules/e-sign/__tests__/esign-delete-tenant-isolation.spec.ts
  10 tests — 10 passed
```

Total: **23 tests, 23 passed.**
