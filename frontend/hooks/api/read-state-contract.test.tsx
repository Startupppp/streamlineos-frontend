import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  QueryClientProvider,
  onlineManager,
  type QueryClient,
} from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiContractError, ApiError } from "@/lib/api-envelope";
import { readErrorReachesBoundary, INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { AccessResponse } from "@/types/access";

/**
 * The eight read states of §8, proved at the layer that produces them. A page
 * can only render a state the data layer makes distinguishable, and the two
 * that collapse without help are empty-vs-denied (a disabled v5 query reports
 * `isPending: true, isFetching: false`, exactly like a finished empty read) and
 * denied-vs-not-yet-known.
 */

const ORG_ID = "org-1";
const USER_ID = "user-1";
const PERMISSION = "hr:employees:view";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

function access(allowed: boolean): AccessResponse {
  return {
    scopes: allowed ? { [PERMISSION]: "all" } : {},
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: { hr: true },
  };
}

function newClient(): QueryClient {
  const client = createAppQueryClient(authenticatedScope(ORG_ID, USER_ID));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false, throwOnError: false },
  });
  return client;
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

interface Employee {
  readonly id: string;
}

function renderEmployees(client: QueryClient, queryFn: () => Promise<Employee[]>) {
  return renderHook(
    () =>
      useGatedQuery<Employee[]>(PERMISSION, {
        queryKey: queryKeys.hr.employees(),
        queryFn,
        staleTime: 0,
      }),
    { wrapper: wrapperFor(client) },
  );
}

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("loading", () => {
  it("is in flight, not empty and not denied", async () => {
    const client = newClient();
    client.setQueryData(queryKeys.access.me(), access(true));
    let release: (rows: Employee[]) => void = () => undefined;
    const pending = new Promise<Employee[]>((resolve) => {
      release = resolve;
    });

    const { result } = renderEmployees(client, () => pending);

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.access.denied).toBe(false);
    expect(result.current.fetchStatus).toBe("fetching");

    await act(async () => {
      release([]);
      await pending;
    });
  });
});

describe("background refresh", () => {
  it("keeps the loaded rows on screen while refetching", async () => {
    const client = newClient();
    client.setQueryData(queryKeys.access.me(), access(true));
    const queryFn = jest
      .fn<Promise<Employee[]>, []>()
      .mockResolvedValue([{ id: "e-1" }]);

    const { result } = renderEmployees(client, queryFn);
    await waitFor(() => expect(result.current.data).toEqual([{ id: "e-1" }]));

    await act(async () => {
      await client.refetchQueries({ queryKey: queryKeys.hr.employees() });
    });

    expect(result.current.data).toEqual([{ id: "e-1" }]);
    expect(result.current.isPending).toBe(false);
  });

  it("does not take the route down when the refresh itself fails", () => {
    const failed = new ApiError("Internal server error", 500);
    expect(readErrorReachesBoundary(failed, { state: { data: [{ id: "e-1" }] } })).toBe(
      false,
    );
  });
});

describe("empty", () => {
  it("is a resolved read with zero rows and an allowed gate", async () => {
    const client = newClient();
    client.setQueryData(queryKeys.access.me(), access(true));

    const { result } = renderEmployees(client, async () => []);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.access.allowed).toBe(true);
    expect(result.current.access.denied).toBe(false);
  });
});

describe("permission denied", () => {
  it("never fires the request and says why the data is missing", async () => {
    const client = newClient();
    client.setQueryData(queryKeys.access.me(), access(false));
    const queryFn = jest.fn<Promise<Employee[]>, []>().mockResolvedValue([]);

    const { result } = renderEmployees(client, queryFn);

    await waitFor(() => expect(result.current.access.denied).toBe(true));
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
    expect(result.current.access.pending).toBe(false);
  });

  it("is distinguishable from empty, which the query flags alone cannot do", async () => {
    const allowedClient = newClient();
    allowedClient.setQueryData(queryKeys.access.me(), access(true));
    const deniedClient = newClient();
    deniedClient.setQueryData(queryKeys.access.me(), access(false));

    const empty = renderEmployees(allowedClient, async () => []);
    const denied = renderEmployees(deniedClient, async () => []);

    await waitFor(() => expect(empty.result.current.isPending).toBe(false));
    await waitFor(() => expect(denied.result.current.access.denied).toBe(true));

    expect(denied.result.current.isFetching).toBe(empty.result.current.isFetching);
    expect(denied.result.current.access.denied).not.toBe(
      empty.result.current.access.denied,
    );
  });
});

describe("access not yet known", () => {
  it("reads as pending rather than denied, so a permitted user is never refused", async () => {
    const client = newClient();
    const queryFn = jest.fn<Promise<Employee[]>, []>().mockResolvedValue([]);

    const { result } = renderEmployees(client, queryFn);

    expect(result.current.access.pending).toBe(true);
    expect(result.current.access.denied).toBe(false);
    expect(queryFn).not.toHaveBeenCalled();

    await act(async () => {
      client.setQueryData(queryKeys.access.me(), access(true));
    });
    await waitFor(() => expect(queryFn).toHaveBeenCalled());
  });
});

describe("revoked access", () => {
  it("stops the read and flips to denied when the access snapshot is withdrawn", async () => {
    const client = newClient();
    client.setQueryData(queryKeys.access.me(), access(true));
    const queryFn = jest
      .fn<Promise<Employee[]>, []>()
      .mockResolvedValue([{ id: "e-1" }]);

    const { result } = renderEmployees(client, queryFn);
    await waitFor(() => expect(result.current.access.allowed).toBe(true));
    const callsWhileAllowed = queryFn.mock.calls.length;

    await act(async () => {
      client.setQueryData(queryKeys.access.me(), access(false));
    });

    await waitFor(() => expect(result.current.access.denied).toBe(true));
    await act(async () => {
      await client.invalidateQueries({ queryKey: queryKeys.hr.employees() });
    });
    expect(queryFn.mock.calls.length).toBe(callsWhileAllowed);
  });
});

describe("offline", () => {
  it("pauses rather than failing, and is distinguishable from loading", async () => {
    const client = newClient();
    client.setQueryData(queryKeys.access.me(), access(true));
    onlineManager.setOnline(false);
    const queryFn = jest.fn<Promise<Employee[]>, []>().mockResolvedValue([]);

    const { result } = renderEmployees(client, queryFn);

    await waitFor(() => expect(result.current.fetchStatus).toBe("paused"));
    expect(result.current.isPending).toBe(true);
    expect(result.current.isFetching).toBe(false);
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.access.denied).toBe(false);
  });

  it("resumes the paused read when the connection returns", async () => {
    const client = newClient();
    client.setQueryData(queryKeys.access.me(), access(true));
    onlineManager.setOnline(false);
    const queryFn = jest.fn<Promise<Employee[]>, []>().mockResolvedValue([]);

    const { result } = renderEmployees(client, queryFn);
    await waitFor(() => expect(result.current.fetchStatus).toBe("paused"));

    await act(async () => {
      onlineManager.setOnline(true);
    });

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
  });
});

describe("full error", () => {
  it("reaches the route boundary when the read produced nothing", () => {
    const failed = new ApiError("Internal server error", 500);
    expect(readErrorReachesBoundary(failed, { state: { data: undefined } })).toBe(true);
  });

  it("treats a contract violation the same way — no screen renders unverified data", () => {
    const violation = new ApiContractError("/hr/employees", 200, [
      { path: "rows.0.salary", message: "Invalid input" },
    ]);
    expect(readErrorReachesBoundary(violation, { state: { data: undefined } })).toBe(true);
  });
});

describe("partial error", () => {
  it("is an explicit opt-out, so one failed panel does not take four working ones down", () => {
    expect(INLINE_READ_ERROR.throwOnError).toBe(false);
  });

  it("still surfaces the failure on the query it belongs to", async () => {
    const client = newClient();
    client.setQueryData(queryKeys.access.me(), access(true));

    const { result } = renderEmployees(client, async () => {
      throw new ApiError("Internal server error", 500);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Internal server error");
    expect(result.current.data).toBeUndefined();
  });
});
