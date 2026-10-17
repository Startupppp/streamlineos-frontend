import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useCreateOrgDepartment, useUpdateOrgDepartment } from "@/hooks/api/org-hierarchy-units";

/**
 * Round-2 UX #6: a department save sat on "Saving…" for ~5 s because the save
 * resolved only after every hierarchy read it invalidated had refetched.
 */

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: object) => useMutation(options),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/lib/api-client", () => ({ apiClient: { post: jest.fn(), patch: jest.fn() } }));

const department = { id: "d1", name: "Ops", code: "OPS" };

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  let resolveRefetch: () => void = () => {};
  let calls = 0;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  // An active hierarchy read whose refetch never settles until we say so.
  const reader = renderHook(
    () =>
      useQuery({
        queryKey: [...platformHierarchyQueryKeys.hierarchy.all, "probe"],
        queryFn: () => {
          calls += 1;
          return calls === 1
            ? Promise.resolve([])
            : new Promise<never[]>((resolve) => {
                resolveRefetch = () => resolve([]);
              });
        },
      }),
    { wrapper },
  );
  return { wrapper, reader, release: () => resolveRefetch(), refetches: () => calls - 1 };
}

beforeEach(() => {
  (apiClient.post as jest.Mock).mockReset().mockResolvedValue(department);
  (apiClient.patch as jest.Mock).mockReset().mockResolvedValue(department);
});

it("a department create resolves without waiting for the hierarchy refetch", async () => {
  const { wrapper, reader, release, refetches } = setup();
  await waitFor(() => expect(reader.result.current.isSuccess).toBe(true));

  const { result } = renderHook(() => useCreateOrgDepartment(), { wrapper });
  await expect(result.current.mutateAsync({ name: "Ops", code: "OPS" })).resolves.toEqual(department);
  expect(refetches()).toBe(1);
  release();
});

it("a department update resolves without waiting for the hierarchy refetch", async () => {
  const { wrapper, reader, release, refetches } = setup();
  await waitFor(() => expect(reader.result.current.isSuccess).toBe(true));

  const { result } = renderHook(() => useUpdateOrgDepartment(), { wrapper });
  await expect(result.current.mutateAsync({ departmentId: "d1", name: "Ops" })).resolves.toEqual(department);
  expect(refetches()).toBe(1);
  release();
});
