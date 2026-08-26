import type { ReactNode } from "react";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { permissionGate } from "@/lib/rbac/permission-gate";
import { EmptyState } from "@/components/ui/empty-state";
import { CrmPipelineMini } from "@/features/crm/shared/crm-pipeline-mini";
import type { AccessResponse } from "@/types/access";

/**
 * The bug this pins: a query disabled by a missing permission reports
 * `isPending: true, isFetching: false`, and `isLoading` is the conjunction of
 * the two — so it is false. Every surface's loading gate therefore falls
 * through to its empty branch, and a user who may not see a list is told the
 * list is empty.
 */

const ORG_ID = "org-1";
const USER_ID = "user-1";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(() => new Promise(() => {})) },
}));

function accessWith(scopes: AccessResponse["scopes"]): AccessResponse {
  return {
    scopes,
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: {},
  };
}

function wrapperFor(access?: AccessResponse) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (access) client.setQueryData(queryKeys.access.me(ORG_ID, USER_ID), access);
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("a refused read is not an empty one", () => {
  it("reports the refusal, because isLoading cannot", async () => {
    const queryFn = jest.fn();
    const { result } = renderHook(
      () =>
        useGatedQuery("crm:campaigns:view", {
          queryKey: ["campaigns-under-test"],
          queryFn,
        }),
      { wrapper: wrapperFor(accessWith({})) },
    );

    await waitFor(() => expect(result.current.access.denied).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.access.permission).toBe("crm:campaigns:view");
  });

  it("does not call an unresolved gate a refusal", async () => {
    const { result } = renderHook(
      () =>
        useGatedQuery("crm:campaigns:view", {
          queryKey: ["campaigns-under-test"],
          queryFn: jest.fn(),
        }),
      { wrapper: wrapperFor() },
    );

    await waitFor(() => expect(result.current.access.pending).toBe(true));
    expect(result.current.access.denied).toBe(false);
  });

  it("lets a permitted read through", async () => {
    const queryFn = jest.fn().mockResolvedValue([]);
    const { result } = renderHook(
      () =>
        useGatedQuery("crm:campaigns:view", {
          queryKey: ["campaigns-under-test"],
          queryFn,
        }),
      { wrapper: wrapperFor(accessWith({ "crm:campaigns:view": "all" })) },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
    expect(result.current.access.denied).toBe(false);
    expect(result.current.access.allowed).toBe(true);
  });
});

describe("an empty state handed a refused read", () => {
  it("states the refusal and names the permission", () => {
    render(
      <EmptyState
        access={permissionGate("crm:campaigns:view", false, true)}
        title="No campaigns yet"
        description="A campaign groups the leads that came from one push."
      />,
    );

    expect(screen.queryByText("No campaigns yet")).not.toBeInTheDocument();
    expect(screen.getByText("crm:campaigns:view")).toBeInTheDocument();
  });

  it("keeps saying nothing is here when the read was allowed", () => {
    render(
      <EmptyState
        access={permissionGate("crm:campaigns:view", true, true)}
        title="No campaigns yet"
      />,
    );

    expect(screen.getByText("No campaigns yet")).toBeInTheDocument();
  });

  it("keeps saying nothing is here when no gate is supplied", () => {
    render(<EmptyState title="No campaigns yet" />);

    expect(screen.getByText("No campaigns yet")).toBeInTheDocument();
  });
});

describe("a surface whose read is refused", () => {
  it("never claims the data is empty", async () => {
    render(<CrmPipelineMini byStatus={{}} total={4} />, {
      wrapper: wrapperFor(accessWith({})),
    });

    await waitFor(() =>
      expect(screen.getByText("crm:leads:view")).toBeInTheDocument(),
    );
    expect(screen.queryByText("No pipeline data")).not.toBeInTheDocument();
  });

  it("still shows first use when the read was allowed and found nothing", async () => {
    render(<CrmPipelineMini byStatus={{}} total={0} />, {
      wrapper: wrapperFor(accessWith({ "crm:leads:view": "all" })),
    });

    await waitFor(() =>
      expect(screen.getByText("No pipeline data")).toBeInTheDocument(),
    );
    expect(screen.queryByText("crm:leads:view")).not.toBeInTheDocument();
  });
});
