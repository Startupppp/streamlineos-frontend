import { Component, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import { useHrSetupSignals } from "./use-hr-setup-signals";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

import { apiClient } from "@/lib/api-client";

const mockedGet = jest.mocked(apiClient.get);

const ACCESS: AccessResponse = {
  scopes: {
    "hr:employees:view": "all",
    "hr:leaves:view": "all",
    "hr:policies:view": "all",
    "hr:attendance:view": "all",
    "hr:documents:view": "all",
  },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { hr: true },
};

class BoundaryProbe extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <p>route error boundary</p>;
    return this.props.children;
  }
}

function client(): QueryClient {
  const queryClient = createAppQueryClient(authenticatedScope("org-1", "user-1"));
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } });
  queryClient.setQueryData(queryKeys.access.me(), ACCESS);
  return queryClient;
}

function SignalsProbe() {
  const signals = useHrSetupSignals();
  return <p>{signals ? `settled:${JSON.stringify(signals)}` : "pending"}</p>;
}

it("settles to unknown signals when every setup read fails, instead of sending the HR hub to the route error boundary (HRMS-016)", async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  mockedGet.mockRejectedValue(new ApiError("upstream", 503));

  render(
    <QueryClientProvider client={client()}>
      <BoundaryProbe>
        <SignalsProbe />
      </BoundaryProbe>
    </QueryClientProvider>,
  );

  await waitFor(() => expect(screen.getByText(/^settled:/)).toBeInTheDocument());
  expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  expect(screen.getByText(/^settled:/).textContent).toBe(
    'settled:{"people":null,"leavePolicies":null,"shifts":null,"documents":null}',
  );
  expect(mockedGet.mock.calls.map(([path]) => path)).toEqual(
    expect.arrayContaining(["/hr/employees/counts", "/hr/leave-policies", "/hr/shifts", "/hr/documents/stats"]),
  );
});
