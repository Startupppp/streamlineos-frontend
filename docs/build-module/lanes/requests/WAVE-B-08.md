# Wave-B-08 Filed Requests

## REQ-1: Update product-scope-pages.test-harness.tsx — add useGoal and useDeleteGoal mocks

**File:** `frontend/features/build/managed-products/product-scope-pages.test-harness.tsx`

**Change needed:** Add `useGoal` and `useDeleteGoal` to the `@/hooks/api/goals` mock block:

```tsx
jest.mock("@/hooks/api/goals", () => ({
  useGoals: jest.fn(),
  useGoalsPage: jest.fn(),
  useGoalStats: jest.fn(() => ({ data: undefined })),
  useGoal: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, error: null })),
  useDeleteGoal: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));
```

**Reason:** `product-goals-page.tsx` needs inline edit/delete functionality (context menu actions on goal cards, per C3 spec for `10-managed-products-product-goals.md`). The standalone `goals-page.tsx` already implements this pattern with `useGoal` and `useDeleteGoal`. Without this harness change, adding those imports to `product-goals-page.tsx` would cause `TypeError: useGoal is not a function` in the harness-based tests.

**Also needed in harness exports (bottom of file):**
```tsx
export const { useGoal, useDeleteGoal } = jest.requireMock("@/hooks/api/goals") as {
  useGoal: jest.Mock;
  useDeleteGoal: jest.Mock;
};
```

---

## REQ-2: Add health, due params to GoalsParams in hooks/api/goals.ts

**File:** `frontend/hooks/api/goals.ts`

**Change needed:** Extend `GoalsParams`:
```ts
interface GoalsParams {
  status?: GoalStatus;
  level?: GoalLevel;
  ownerId?: string;
  projectId?: number;
  managedProductId?: number;
  search?: string;
  page?: number;
  limit?: number;
  health?: string;
  due?: string;
  scope?: string;
}
```

**Reason:** The spec `10-managed-products-product-goals.md` lists `scope`, `health`, and `due` as URL-backed query parameters. `GOAL_FILTER_DEFINITIONS` already tracks them in the URL but they are never forwarded to `useGoalsPage`. Adding these params to the interface allows `product-goals-page.tsx` to forward them to the API call, completing the URL→API wiring. The backend needs a corresponding change to filter on these params.

**Backend counterpart needed:** `backend/src/modules/build/goals/goals.controller.ts` and the underlying query need to accept and apply `health`, `due`, and `scope` filters.
