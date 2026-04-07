# Task 13: Testing Strategy

## Priority: HIGH | Effort: 4-5 days | Dependencies: None | Status: NOT STARTED

---

## PRD

### Problem Statement
The application has only 4 test files (`format-utils.test.ts`, `leave-policy.test.ts`, `pagination.test.ts`, `password-utils.test.ts`) covering utility functions. There are:
1. **Zero component tests** - No React component testing
2. **Zero API/tRPC tests** - No server-side testing
3. **Zero integration tests** - No end-to-end flow testing
4. **Zero auth tests** - Critical auth flows untested
5. **No test infrastructure** - Vitest is configured but barely used
6. **No CI test step** - CI runs lint/build but not tests

### Goals
- Achieve 60%+ code coverage on critical paths
- Test all auth flows (login, logout, password reset, invitation)
- Test all tRPC procedure inputs/outputs
- Test critical UI components (forms, data tables, kanban)
- Test RBAC permission checks
- Add tests to CI pipeline
- Create testing patterns/utilities for future development

### Non-Goals
- 100% code coverage (diminishing returns)
- Visual regression testing (can add later with Playwright)
- Performance/load testing (separate concern)
- Mobile testing (Playwright later)

### Success Criteria
- 60%+ coverage on `server/`, `lib/`, `hooks/` directories
- All auth flows have integration tests
- All form validations (Zod schemas) have unit tests
- CI pipeline runs tests and blocks merge on failure
- Testing utilities and patterns documented

---

## Rules to Follow

1. **Test Behavior, Not Implementation**: Test what the code does, not how it does it
2. **Arrange-Act-Assert**: Every test follows AAA pattern
3. **One Assertion Per Test**: Each test verifies one behavior
4. **No Test Interdependence**: Tests must run independently in any order
5. **Mock External Services**: DB, Redis, email, S3 - mock at the boundary
6. **Realistic Test Data**: Use factories, not arbitrary strings
7. **Fast Tests**: Unit tests <100ms, integration tests <2s
8. **Named Test Functions**: No anonymous test callbacks

---

## Implementation Steps

### Step 1: Set Up Testing Infrastructure

**Update**: `vitest.config.ts`
```ts
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["server/**", "lib/**", "hooks/**", "components/**"],
      exclude: ["**/*.d.ts", "**/types/**", "**/node_modules/**"],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
});
```

**Create**: `test/setup.ts`
```ts
import "@testing-library/jest-dom";
// Mock next-auth
vi.mock("next-auth", () => ({ ... }));
// Mock Redis
vi.mock("@/lib/redis", () => ({ ... }));
```

**Create**: `test/factories/` - Test data factories
```ts
// test/factories/user.ts - Creates realistic user test data
// test/factories/lead.ts - Creates realistic lead test data
// test/factories/organization.ts - Creates realistic org test data
```

**Create**: `test/helpers/` - Test utilities
```ts
// test/helpers/db.ts - In-memory DB for testing
// test/helpers/auth.ts - Mock session helpers
// test/helpers/render.tsx - Custom render with providers
```

### Step 2: Unit Tests - Utilities & Validation

**Target files and test files**:

| Source File | Test File | What to Test |
|-------------|-----------|-------------|
| `lib/format-utils.ts` | `__tests__/format-utils.test.ts` | Currency, dates, numbers (exists, expand) |
| `lib/pagination.ts` | `__tests__/pagination.test.ts` | Edge cases, large datasets (exists, expand) |
| `lib/password-utils.ts` | `__tests__/password-utils.test.ts` | Hashing, validation (exists, expand) |
| `lib/leave-policy.ts` | `__tests__/leave-policy.test.ts` | Balance calculations (exists, expand) |
| `lib/date-utils.ts` | `__tests__/date-utils.test.ts` | Date formatting, range calculations |
| `lib/encryption.ts` | `__tests__/encryption.test.ts` | Encrypt/decrypt roundtrip |
| `lib/utils.ts` | `__tests__/utils.test.ts` | cn(), general utilities |
| `lib/validations/hr.ts` | `__tests__/validations/hr.test.ts` | All Zod schemas |
| `lib/validations/leave.ts` | `__tests__/validations/leave.test.ts` | All Zod schemas |
| `lib/validations/project.ts` | `__tests__/validations/project.test.ts` | All Zod schemas |
| `lib/validations/attendance.ts` | `__tests__/validations/attendance.test.ts` | All Zod schemas |
| `lib/rbac/permissions.ts` | `__tests__/rbac/permissions.test.ts` | Permission checks |

### Step 3: Unit Tests - Server Actions

| Source File | Test File | What to Test |
|-------------|-----------|-------------|
| `server/actions/auth-actions.ts` | `__tests__/actions/auth.test.ts` | Password change, user update |
| `server/actions/leave-actions.ts` | `__tests__/actions/leave.test.ts` | Request, approve, reject |
| `server/actions/expense-actions.ts` | `__tests__/actions/expense.test.ts` | Submit, approve, reject |
| `server/actions/hr-actions.ts` | `__tests__/actions/hr.test.ts` | Employee CRUD |
| `server/actions/document-actions.ts` | `__tests__/actions/document.test.ts` | Upload, delete |

### Step 4: tRPC Router Tests

**Pattern**:
```ts
// __tests__/routers/leads.test.ts
describe("leads router", () => {
  describe("getAll", () => {
    it("returns paginated leads for org", async () => { ... });
    it("filters by status", async () => { ... });
    it("SALES role sees only assigned leads", async () => { ... });
    it("returns empty list for no results", async () => { ... });
  });
  describe("create", () => {
    it("creates lead with valid input", async () => { ... });
    it("rejects invalid email format", async () => { ... });
    it("auto-assigns via assignment rules", async () => { ... });
    it("calculates SLA deadline", async () => { ... });
  });
});
```

**Routers to test**:
- `leads.ts` - Most critical, most complex
- `deals.ts` - Deal pipeline logic
- `auth.ts` - Login, register, password reset
- `hr/leave.ts` - Leave balance calculations
- `hr/attendance.ts` - Check-in/out logic
- `hr/expense.ts` - Approval workflow
- `dashboard.ts` - Stats aggregation
- `notifications.ts` - CRUD operations

### Step 5: Component Tests

**Pattern**:
```tsx
// __tests__/components/notification-bell.test.tsx
describe("NotificationBell", () => {
  it("shows unread count badge", () => { ... });
  it("marks notification as read on click", () => { ... });
  it("shows empty state when no notifications", () => { ... });
});
```

**Components to test**:
- `components/layout/notification-bell.tsx` - Notification interactions
- `components/shared/data-table.tsx` - Sorting, selection, pagination
- `components/rbac/permission-gate.tsx` - Shows/hides based on permissions
- `components/auth/organization-guard.tsx` - Access control
- `components/hr/leave-request-form.tsx` - Form validation
- `components/crm/csv-upload-dialog.tsx` - CSV parsing
- `components/crm/lead-export-dialog.tsx` - Export logic

### Step 6: Integration Tests

**Auth flow**:
```ts
describe("Auth Integration", () => {
  it("complete login flow", () => { ... });
  it("locks account after 10 failed attempts", () => { ... });
  it("password reset flow", () => { ... });
  it("invitation acceptance flow", () => { ... });
});
```

**CRM flow**:
```ts
describe("CRM Pipeline", () => {
  it("lead creation → assignment → conversion → deal", () => { ... });
  it("bulk lead operations", () => { ... });
});
```

### Step 7: Add Tests to CI

**Update**: `.github/workflows/ci.yml`
```yaml
- name: Run Tests
  run: pnpm test --coverage

- name: Check Coverage
  run: pnpm test --coverage --reporter=json
  # Fail if below threshold
```

---

## Checklist

- [ ] Update `vitest.config.ts` with coverage thresholds
- [ ] Create `test/setup.ts` with global mocks
- [ ] Create test data factories (user, lead, org, deal)
- [ ] Create test helpers (db mock, auth mock, render wrapper)
- [ ] Write unit tests for all `lib/validations/*.ts` files
- [ ] Write unit tests for `lib/date-utils.ts`
- [ ] Write unit tests for `lib/encryption.ts`
- [ ] Write unit tests for `lib/rbac/permissions.ts`
- [ ] Expand existing 4 test files with edge cases
- [ ] Write server action tests (auth, leave, expense, hr)
- [ ] Write tRPC router tests (leads, deals, auth, hr, dashboard)
- [ ] Write component tests (notification-bell, data-table, permission-gate)
- [ ] Write integration tests (auth flow, CRM pipeline)
- [ ] Add test step to CI pipeline
- [ ] Configure coverage reporting
- [ ] `pnpm test` passes with 60%+ coverage on target directories
- [ ] CI blocks merge on test failure

---

## Acceptance Criteria

1. `pnpm test` runs all tests successfully
2. Coverage report shows 60%+ on `server/`, `lib/`, `hooks/`
3. All Zod validation schemas have test coverage
4. Auth flows (login, password reset, invitation) tested
5. RBAC permission checks tested
6. CI pipeline runs tests and blocks on failure
7. Test patterns documented for future development

---

## Testing Plan

This IS the testing plan. Meta-test:
1. Run `pnpm test --coverage` and verify thresholds met
2. Break a validation schema, verify test catches it
3. Break an auth flow, verify test catches it
4. Push a PR with failing tests, verify CI blocks merge
