# Cross-Tenant Isolation Test Template

Based on real covered specs:
- `src/modules/accounting/core/accounting-aging-tenant-isolation.spec.ts`
- `src/modules/accounting/settings/accounting-settings-tenant-isolation.spec.ts`
- `src/modules/agent-access/agent-tokens.service.spec.ts`

---

## Pattern A — Direct instantiation (preferred; no NestJS TestingModule needed)

This is the dominant pattern in covered specs. It directly constructs the service with a mocked Db
and asserts that the `where` clause includes the orgId and returns an empty result for a foreign org.

```typescript
// src/modules/<module>/<feature>-tenant-isolation.spec.ts
//
// FILE MUST be named *.spec.ts — NOT *.e2e-spec.ts.
// e2e-spec files are excluded from the default jest run (testPathIgnorePatterns).

import type { Db } from "../../../db/drizzle.module";
import { MyFeatureService } from "./my-feature.service";

// ─── helpers ──────────────────────────────────────────────────────────────────

// Walks the Drizzle condition tree to collect leaf values.
// NEVER use JSON.stringify on a Drizzle condition — conditions are circular and
// JSON.stringify throws. This walker handles cycles via the `seen` set.
function sqlValues(value: unknown, seen = new Set<object>()): unknown[] {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [value];
  }
  if (Array.isArray(value)) return value.flatMap((item) => sqlValues(item, seen));
  if (typeof value !== "object" || seen.has(value)) return [];

  seen.add(value);
  const record = value as { queryChunks?: unknown[]; value?: unknown };
  return [
    ...(record.queryChunks ? sqlValues(record.queryChunks, seen) : []),
    ...(Object.prototype.hasOwnProperty.call(record, "value")
      ? sqlValues(record.value, seen)
      : []),
  ];
}

// Builds a minimal Drizzle-shaped db mock for services that call:
//   db.select().from(table).where(condition)  — optionally chained with .limit/.orderBy/.leftJoin
// Extend the chain as needed for the service under test.
type SelectBuilder = {
  from: jest.Mock;
  where: jest.Mock;
  limit: jest.Mock;
  orderBy?: jest.Mock;
  leftJoin?: jest.Mock;
};

function makeDb(rows: unknown[]): { db: Db; where: jest.Mock } {
  const where = jest.fn().mockResolvedValue(rows); // terminal: resolves the query
  const builder: SelectBuilder = {
    from: jest.fn(),
    where,
    limit: jest.fn().mockResolvedValue(rows),
  };
  builder.from.mockReturnValue(builder);
  // If the service chains further (e.g. .where(...).limit(...)), make where return the builder too:
  // builder.where.mockReturnValue(builder);  // uncomment if needed

  const db = { select: jest.fn().mockReturnValue(builder) } as unknown as Db;
  return { db, where };
}

// ─── spec ─────────────────────────────────────────────────────────────────────

// IMPORTANT: the describe or it block MUST contain one of these strings
// (case-insensitive) or the checker will not count it as covered:
//   cross-tenant, tenant isolation, different org, other org, org isolation,
//   bola, cross-org, isolation, inaccessible, forbidden.*org, wrong.*org

describe("MyFeatureService — cross-tenant isolation", () => {
  const ATTACKER_ORG = "org-attacker";
  const OWNER_ORG    = "org-owner";
  const ROW          = { id: 1, orgId: OWNER_ORG, name: "secret" };

  it("hides rows owned by a different org (returns nothing for attacker)", async () => {
    // Arrange: DB returns empty — simulates the where(eq(table.orgId, orgId)) predicate
    // filtering out rows that belong to OWNER_ORG when queried with ATTACKER_ORG.
    const { db, where } = makeDb([]);
    const svc = new MyFeatureService(db);

    // Act
    const result = await svc.list(ATTACKER_ORG);

    // Assert: empty result
    expect(result).toHaveLength(0);

    // Assert: the query was scoped to the attacker's orgId (not bypassed).
    // The where predicate MUST contain the orgId as a leaf value.
    expect(where).toHaveBeenCalledTimes(1);
    expect(sqlValues(where.mock.calls[0]?.[0])).toContain(ATTACKER_ORG);
  });

  it("returns the row for the owning org (control — same-tenant access works)", async () => {
    // This case must pass so the test cannot be satisfied by always returning [].
    const { db } = makeDb([ROW]);
    const svc = new MyFeatureService(db);

    const result = await svc.list(OWNER_ORG);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1 });
  });
});
```

---

## Pattern B — Mutation endpoint (asserts NotFoundException before any write)

Use this when the service does a fetch-then-mutate pattern (get record, check org, then update/delete).
The service must throw `NotFoundException` (not `ForbiddenException`) for a cross-tenant id.
A 403 on another org's id is an existence oracle — return 404 always for cross-tenant misses.

```typescript
import { NotFoundException } from "@nestjs/common";
import type { Db } from "../../../db/drizzle.module";
import { MyMutatingService } from "./my-mutating.service";

function makeSelectDb(rows: unknown[]): { db: Db; where: jest.Mock } {
  const where = jest.fn();
  const limit = jest.fn().mockResolvedValue(rows);
  where.mockReturnValue({ limit });

  const builder = {
    from: jest.fn().mockReturnValue({ where }),
  };
  const db = { select: jest.fn().mockReturnValue(builder) } as unknown as Db;
  return { db, where };
}

describe("MyMutatingService — cross-tenant isolation", () => {
  it("throws NotFoundException when resource belongs to a different org", async () => {
    // Arrange: select returns empty — the record does not exist for this org
    const { db } = makeSelectDb([]);
    const svc = new MyMutatingService(db);

    // Act + Assert
    await expect(svc.update("org-attacker", 99, { name: "hack" })).rejects.toThrow(
      NotFoundException,
    );
  });

  it("succeeds for the owning org (control)", async () => {
    const ROW = { id: 99, orgId: "org-owner", name: "original" };
    const { db } = makeSelectDb([ROW]);
    // If update also needs a mock, extend makeSelectDb to include db.update chain
    const svc = new MyMutatingService(db);
    // Should not throw:
    await expect(svc.update("org-owner", 99, { name: "new" })).resolves.not.toThrow();
  });
});
```

---

## Pattern C — NestJS TestingModule (use only when the service has injected dependencies)

Use this when the service has multiple injected tokens (e.g. AccessService, CacheService)
and direct construction is too verbose. Mirrors the pattern in `agent-tokens.service.spec.ts`.

```typescript
import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { MyService } from "./my.service";
import { DRIZZLE } from "../../db/drizzle.constants";
import { AuditService } from "../../common/audit/audit.service";

describe("MyService — tenant isolation", () => {
  let svc: MyService;
  let mockDb: { select: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    mockDb = { select: jest.fn(), update: jest.fn() };

    const mod = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    svc = mod.get(MyService);
  });

  it("returns nothing for a different org (cross-tenant isolation)", async () => {
    // Wire the select chain to return empty for any org
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    const result = await svc.list("org-other");
    expect(result).toHaveLength(0);
  });
});
```

---

## Critical traps — must encode in every test

### 1. db.transaction mock MUST invoke its callback

A bare `jest.fn()` for `db.transaction` silently voids every assertion inside the transaction.
The transaction mock must call through:

```typescript
// WRONG — silently skips all assertions inside the tx:
mockDb.transaction = jest.fn();

// CORRECT — calls the callback with a tx object (which can be the same mock):
mockDb.transaction = jest.fn().mockImplementation(async (fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb));
```

### 2. Never JSON.stringify a Drizzle condition

Drizzle conditions are circular objects. `JSON.stringify` throws at runtime.
Use the `sqlValues()` helper above (which tracks a `seen` set) to inspect leaf values.

### 3. Named *.e2e-spec.ts files are excluded from default jest

`testPathIgnorePatterns` in jest.config.ts excludes `e2e-spec`. A file named
`my-feature.e2e-spec.ts` is NOT executed by `pnpm test` and will never satisfy coverage.
Name isolation spec files `*.spec.ts` or `*-tenant-isolation.spec.ts`.

### 4. withTenant / relocation tracker fires an unmocked db.select

If the service uses `withTenant` or the relocation tracker, the first tenant transaction
triggers an unmocked `db.select` for the tenant context, which breaks scripted sequence mocks.
Use Pattern A (direct instantiation, no `withTenant` call needed in unit tests), or
reset and re-wire `mockDb.select` after the initial relocation call completes.

### 5. Inserting a query at the front of a service reassigns sequence mocks

If you add mocked DB calls in the order they are called in the service, inserting one
call at the start shifts every subsequent mock. Assign mocks by pattern (e.g. mock
`findFirst` separately from `select`), not by call-order index.

### 6. The test MUST trigger the where clause, not just return empty

The `sqlValues` assertion (or the NotFoundException assertion) proves the WHERE predicate
was evaluated. If you only check `result.length === 0`, a service that hard-codes `return []`
would pass. Always assert that the where call contained the orgId.

---

## Coverage check rule (exact source — check-tenant-isolation-coverage.mjs lines 107-124)

```js
function hasIsolationTest(serviceFile, allSpecFiles) {
  const src = readFileSync(serviceFile, "utf8");
  const className = serviceClassName(src);          // export class XxxService → "XxxService"
  const relPath = relative(BACKEND_ROOT, serviceFile).replace(/\\/g, "/");
  const classNameRe = className ? new RegExp(`\\b${className}\\b`) : null;

  for (const specFile of allSpecFiles) {
    const specSrc = readFileSync(specFile, "utf8");

    const referencesService =
      (classNameRe !== null && classNameRe.test(specSrc)) ||   // class name appears in spec
      specSrc.includes(relPath);                                // OR relative path string appears

    if (!referencesService) continue;

    if (ISOLATION_PATTERNS.some((re) => re.test(specSrc))) return true;  // pattern found
  }
  return false;
}
```

A spec satisfies coverage when:
1. It references the service class name (word-boundary match) OR includes the service's relative path.
2. Its source contains at least one of: `/cross.?tenant/i`, `/tenant.?isolation/i`, `/different.?org/i`,
   `/other.?org/i`, `/org.?isolation/i`, `/bola/i`, `/cross-org/i`, `/isolation/i`,
   `/inaccessible/i`, `/forbidden.*org/i`, `/wrong.*org/i`.

Both conditions must be true. A spec that only has "isolation" in its describe string but never
imports the service class will NOT count. A spec that imports the class but has no isolation
keyword will NOT count.
