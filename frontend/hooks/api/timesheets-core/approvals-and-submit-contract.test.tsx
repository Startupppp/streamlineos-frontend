/**
 * FE-TS-010 and FE-TS-011 — what a timesheet decision leaves behind.
 *
 * FE-TS-010: approve/reject invalidated only the approvals queue and the period
 * list, so a manager who approved and then opened Team, Reports, Billing or
 * Overdue read pre-approval numbers until staleTime elapsed.
 *
 * FE-TS-011: submit is fenced server-side with
 * `@Idempotent("timesheets.period.submit")`, but the api-client mints a fresh
 * `Idempotency-Key` per fetch — so a retry of the same intent reached the fence
 * as a different command and the fence protected nothing. The key has to be the
 * same across attempts of one intent.
 */
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import { useApprovePeriod } from "./approvals";
import { useSubmitPeriod } from "./periods";

const ORG_ID = "org-1";
const USER_ID = "user-1";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: ORG_ID, user: { id: USER_ID } }, status: "authenticated" }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";

const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const ACCESS: AccessResponse = {
  scopes: { "timesheets:approvals:manage": "all", "timesheets:entries:create": "own" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { timesheets: true },
};

function harness(): { client: QueryClient; wrapper: ({ children }: { children: ReactNode }) => ReactNode } {
  const client = createAppQueryClient(authenticatedScope(ORG_ID, USER_ID));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } });
  client.setQueryData(queryKeys.access.me(), ACCESS);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

function idempotencyKeysSentTo(path: string): string[] {
  return mockedPost.mock.calls
    .filter((call) => call[0] === path)
    .map((call) => {
      const options = call[2] as { headers?: Record<string, string> } | undefined;
      return options?.headers?.["Idempotency-Key"] ?? "";
    });
}

beforeEach(() => jest.clearAllMocks());

it("FE-TS-010: an approval invalidates every timesheet surface, not just the queue", async () => {
  mockedPost.mockResolvedValue({ id: 7, status: "APPROVED" });
  const { client, wrapper } = harness();
  const invalidate = jest.spyOn(client, "invalidateQueries");

  const { result } = renderHook(() => useApprovePeriod(), { wrapper });
  result.current.mutate(7);

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  const invalidatedKeys = invalidate.mock.calls.map((call) => call[0]?.queryKey);
  expect(invalidatedKeys).toContainEqual(usersAndCommerceQueryKeys.timesheets.all);
});

it("FE-TS-011: a retried submit reaches the fence under the same Idempotency-Key", async () => {
  const { wrapper } = harness();
  const { result } = renderHook(() => useSubmitPeriod(), { wrapper });

  mockedPost.mockRejectedValueOnce(new Error("network"));
  result.current.mutate(7);
  await waitFor(() => expect(result.current.isError).toBe(true));

  mockedPost.mockResolvedValueOnce({ id: 7, status: "SUBMITTED" });
  result.current.mutate(7);
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  const keys = idempotencyKeysSentTo("/timesheets/periods/7/submit");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
});
