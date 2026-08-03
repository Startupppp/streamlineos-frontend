# HRMS Plan 04 — Cache Invalidation + Transactional Writes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close two backend correctness gaps in HR: stale leave-analytics cache after a leave decision, and a non-transactional candidate stage move (CLAUDE.md §11 caching, §18/§19 transactions).

**Architecture:** (1) `LeavesWriteService` gains a `CacheService` dependency and busts the `hr:leave-analytics:${orgId}:*` cache on every status mutation. (2) `moveStage` wraps its two DB writes (candidate status + SLA row) in a single `db.transaction`, moving notification/automation side-effects to after commit.

**Tech Stack:** NestJS · Drizzle · Redis (CacheService) · Jest. Run commands from `backend/`.

**Verified facts:** analytics cache key = `hr:leave-analytics:${orgId}:${year}` (`leaves.service.ts:204`); `CacheService.invalidatePattern(pattern)` exists (`cache.service.ts:49`); `LeavesWriteService` currently has **no** cache dependency; `moveStage` does the `candidates` UPDATE (`recruitment-candidates.service.ts:360`) and `candidateSlaTracking` INSERT (`:398`) as two separate awaits.

---

### Task 1: Bust leave-analytics cache on every leave status mutation

**Files:**
- Modify: `backend/src/modules/hr-time/leaves-write.service.ts`

- [ ] **Step 1: Inject `CacheService` + add an invalidation helper**

Add the import and constructor dependency, and a private helper.

Import (top, with the other `../..` imports):
```typescript
import { CacheService } from "../../common/cache/cache.service";
```
Constructor — add as the final parameter (after `payrollInputs`):
```typescript
    private readonly payrollInputs: PayrollInputsService,
    private readonly cache: CacheService,
  ) {}

  private async invalidateLeaveAnalytics(orgId: string): Promise<void> {
    await this.cache.invalidatePattern(`hr:leave-analytics:${orgId}:*`);
  }
```

- [ ] **Step 2: Call the helper in every status-changing method**

In `create` — before `return { success: true, ... }`:
```typescript
    await this.invalidateLeaveAnalytics(u.orgId);
```
In `cancel` — before `return { ok: true as const };`:
```typescript
    await this.invalidateLeaveAnalytics(u.orgId);
```
In `updateStatus` — before `return { ok: true as const };`:
```typescript
    await this.invalidateLeaveAnalytics(u.orgId);
```
In `approve` — before `return { success: true };`:
```typescript
    await this.invalidateLeaveAnalytics(u.orgId);
```
In `reject` — before `return { success: true };`:
```typescript
    await this.invalidateLeaveAnalytics(u.orgId);
```

- [ ] **Step 3: Typecheck + lint**

Run: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json`
Run: `npx eslint src/modules/hr-time/leaves-write.service.ts`
Expected: both exit 0. (The new constructor param is auto-wired by Nest DI; `LeavesModule` already provides `CacheService` transitively via `CacheModule` — verify it's imported in the module; if not, add `CacheModule` to the module imports.)

- [ ] **Step 4: Verify DI wiring by loading the module in the existing e2e/unit harness**

Run: `npx jest hr-time --silent`
Expected: existing hr-time suites still pass (no DI resolution error for `CacheService`).

---

### Task 2: Make `moveStage` transactional

**Files:**
- Modify: `backend/src/modules/hr-recruitment/recruitment-candidates.service.ts` (`moveStage`, lines 337-425)
- Test: `backend/src/modules/hr-recruitment/recruitment-candidates.movestage.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `recruitment-candidates.movestage.spec.ts`:
```typescript
process.env.APP_URL ??= "http://localhost:1000";
import { RecruitmentCandidatesService } from "./recruitment-candidates.service";

describe("RecruitmentCandidatesService.moveStage — transactional", () => {
  it("writes candidate status and SLA row inside one transaction", async () => {
    const updated = { id: 1, status: "SCREENING" };
    const calls: string[] = [];
    const tx = {
      update: () => ({ set: () => ({ where: () => ({ returning: () => { calls.push("update"); return Promise.resolve([updated]); } }) }) }),
      insert: () => ({ values: () => ({ onConflictDoUpdate: () => { calls.push("sla"); return Promise.resolve(undefined); } }) }),
    };
    const db = {
      query: { candidates: { findFirst: () => Promise.resolve({ id: 1, status: "APPLIED", firstName: "A", lastName: "B", email: null }) } },
      transaction: (cb: (t: unknown) => Promise<unknown>) => { calls.push("tx:start"); return cb(tx); },
    };
    const audit = { log: () => undefined };
    const automation = { runAutomationsForEvent: () => Promise.resolve() };
    const service = new RecruitmentCandidatesService(
      db as never, audit as never, undefined as never, automation as never,
      undefined as never, undefined as never, undefined as never,
    );
    const result = await service.moveStage("org-1", "user-1", 1, { stage: "SCREENING" } as never);
    expect(calls).toEqual(["tx:start", "update", "sla"]);
    expect(result).toEqual({ id: 1, stage: "SCREENING", changed: true });
  });
});
```
> NOTE (execution): the `new RecruitmentCandidatesService(...)` argument list above is illustrative — before running, open the service's constructor and pass `undefined as never` for every dependency except `db`, `audit`, and `automation`, matched positionally. `STAGE_TRANSITIONS` must allow `APPLIED → SCREENING`; if not, pick a valid pair from the constant.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest recruitment-candidates.movestage --silent`
Expected: FAIL — current code calls `this.db.update(...)` / `this.db.insert(...)` (not `tx`), and never calls `db.transaction`, so `calls` won't equal `["tx:start","update","sla"]`.

- [ ] **Step 3: Wrap the two writes in a transaction; move side-effects after commit**

Replace the block from `const [updated] = await this.db` (line 360) through the `candidateSlaTracking` insert (line 412) with:
```typescript
    const [updated] = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(candidates)
        .set({ status: newStage, updatedAt: new Date() })
        .where(and(eq(candidates.id, candidateId), eq(candidates.orgId, orgId)))
        .returning();

      await tx
        .insert(candidateSlaTracking)
        .values({
          orgId,
          candidateId,
          stage: newStage,
          enteredAt: new Date(),
          breachedAt: null,
          status: "ON_TRACK",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [candidateSlaTracking.candidateId, candidateSlaTracking.stage],
          set: { enteredAt: new Date(), breachedAt: null, status: "ON_TRACK", updatedAt: new Date() },
        });

      return [row];
    });

    this.audit.log({
      action: "CANDIDATE_STAGE_CHANGED",
      userId,
      orgId,
      targetId: String(candidateId),
      targetType: "candidate",
      metadata: {
        from: existing.status,
        to: newStage,
        candidateName: `${existing.firstName} ${existing.lastName}`,
      },
    });

    if (newStage === "REJECTED") {
      await this.notifyByRoles(orgId, ["HR_MANAGER", "CEO", "HR"], {
        type: "INFO",
        title: "Candidate Rejected",
        message: `${existing.firstName} ${existing.lastName} has been moved to Rejected.`,
        link: `/hr/recruitment/candidates/${candidateId}`,
        metadata: { candidateId, stage: newStage },
      });

      if (existing.email) {
        void this.dispatchRejectionEmail(
          orgId,
          candidateId,
          `${existing.firstName} ${existing.lastName}`,
          existing.email,
        ).catch(() => undefined);
      }
    }
```
The existing `void this.automation.runAutomationsForEvent(...)` block and `return { id: updated.id, stage: updated.status, changed: true };` remain unchanged directly after this.

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest recruitment-candidates.movestage --silent`
Expected: PASS — `calls` equals `["tx:start","update","sla"]`.

- [ ] **Step 5: Typecheck + lint**

Run: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.build.json`
Run: `npx eslint src/modules/hr-recruitment/recruitment-candidates.service.ts`
Expected: both exit 0.

---

### Task 3: Commit

- [ ] **Step 1: Stage explicit paths (never `git add -A` — concurrent sessions edit this repo) + commit**

```bash
git add src/modules/hr-time/leaves-write.service.ts \
        src/modules/hr-recruitment/recruitment-candidates.service.ts \
        src/modules/hr-recruitment/recruitment-candidates.movestage.spec.ts
git commit -m "fix(hr): bust leave-analytics cache on decisions; make moveStage transactional"
```

## Definition of Done
- Leave create/cancel/approve/reject/updateStatus invalidate `hr:leave-analytics:${orgId}:*`.
- `moveStage` writes candidate status + SLA row in one transaction; notifications/automation run after commit.
- `tsc` 0 · `eslint` 0 · `jest hr-time hr-recruitment` green · `PAGES.md` updated · committed with explicit paths.
