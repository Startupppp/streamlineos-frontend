import { Component, type ReactNode } from "react";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import type { OnboardEmployeeInput } from "@/types/hr";


jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";
import { useSalaryStructureTemplates } from "@/hooks/api/hr/salary-structures";
import { useManagerCandidates } from "@/hooks/api/hr/reporting-lines";
import { useMyManagerCandidates } from "@/hooks/api/hr/my-reporting-line";
import { useOnboardingTemplateDepartments } from "@/hooks/api/hr/onboarding";
import { useOrgLocations } from "@/hooks/api/org-hierarchy";
import { useOnboardEmployee } from "@/hooks/api/hr/employee-profile";

const get = jest.mocked(apiClient.get);
const post = jest.mocked(apiClient.post);

const ACCESS: AccessResponse = {
  scopes: {
    "hr:salary:view": "all",
    "hr:employees:view": "all",
    "hr:onboarding:manage": "all",
    "settings:view": "all",
  },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { hr: true, payroll: true },
};

function newClient(): QueryClient {
  const client = createAppQueryClient(authenticatedScope("org-1", "user-1"));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } });
  client.setQueryData(queryKeys.access.me(), ACCESS);
  return client;
}

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

interface ReadResult {
  isError: boolean;
}

function Probe({ useRead }: { useRead: () => ReadResult }) {
  const read = useRead();
  return <p>{read.isError ? "inline failure" : "pending"}</p>;
}

const WIZARD_READS: ReadonlyArray<[string, () => ReadResult]> = [
  ["salary structure templates (step 3)", () => useSalaryStructureTemplates()],
  ["manager candidates (step 2 picker)", () => useManagerCandidates("")],
  ["my manager candidates (self picker)", () => useMyManagerCandidates("")],
  ["onboarding departments (on mount)", () => useOnboardingTemplateDepartments()],
  ["org locations (on mount)", () => useOrgLocations({ status: "ACTIVE" })],
];

let consoleError: jest.SpyInstance;

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockRejectedValue(new ApiError("Service unavailable", 503));
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe.each(WIZARD_READS)("a 503 on %s", (_name, useRead) => {
  it("stays inline instead of replacing the onboarding page", async () => {
    render(
      <QueryClientProvider client={newClient()}>
        <BoundaryProbe>
          <Probe useRead={useRead} />
        </BoundaryProbe>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("inline failure")).toBeInTheDocument();
    expect(screen.queryByText("route error boundary")).toBeNull();
  });
});

describe("resubmitting a failed onboard", () => {
  const INPUT: OnboardEmployeeInput = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    designation: "Engineer",
    role: "member",
  };

  function keysSent(): unknown[] {
    return post.mock.calls.map((call) => call[2]?.headers?.["Idempotency-Key"]);
  }

  it("reuses the idempotency key, so a 503 that landed after commit replays", async () => {
    post
      .mockRejectedValueOnce(new ApiError("Service unavailable", 503))
      .mockResolvedValueOnce({ success: true, userId: "u-1", invite: { sent: true }, primaryManager: null });
    const client = newClient();
    const { result } = renderHook(() => useOnboardEmployee(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await act(async () => {
      await result.current.mutateAsync(INPUT).catch(() => undefined);
    });
    await act(async () => {
      await result.current.mutateAsync(INPUT).catch(() => undefined);
    });

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    const [first, second] = keysSent();
    expect(typeof first).toBe("string");
    expect(second).toBe(first);
  });
});
