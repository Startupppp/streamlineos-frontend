import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { applyAdjustment, type LayoutAdjustment } from "@/lib/renderer/layout-adjustment";
import type { RecordLayout } from "@/lib/renderer/layout";
import { useLayoutAdjustment } from "./layouts";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), put: jest.fn(), delete: jest.fn() },
  setAutoSignOutSuppressed: jest.fn(),
}));

jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));

const mockedGet = apiClient.get as jest.Mock;
const mockedSession = useSession as unknown as jest.Mock;

const LAYOUT: RecordLayout = {
  key: "specimen",
  singular: "Specimen",
  plural: "Specimens",
  titleField: "label",
  fields: [
    { name: "label", label: "Label", kind: "text", required: true },
    { name: "owner", label: "Owner", kind: "text" },
    { name: "site", label: "Site", kind: "text" },
    { name: "mass", label: "Mass", kind: "number" },
  ],
  list: {
    searchPlaceholder: "Search specimens…",
    columns: [
      { field: "label", primary: true },
      { field: "owner" },
      { field: "site" },
      { field: "mass" },
    ],
  },
  detail: { sections: [{ title: "All", fields: ["label", "owner", "site", "mass"] }] },
  form: { sections: [{ title: "All", fields: ["label", "owner", "site", "mass"] }] },
};

const ACME = "org_acme";
const GLOBEX = "org_globex";

const ACME_ARRANGEMENT: LayoutAdjustment = { layoutKey: "specimen", hidden: ["owner"] };
const GLOBEX_ARRANGEMENT: LayoutAdjustment = { layoutKey: "specimen", order: ["mass"] };

function actingAs(orgId: string): void {
  mockedSession.mockReturnValue({ data: { orgId }, status: "authenticated" });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function freshClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

describe("two tenants sharing one browser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockImplementation((path: string) => {
      expect(path).toBe("/renderer/layouts/specimen");
      return Promise.resolve(null);
    });
  });

  it("addresses a tenant's arrangement by the tenant, never by the record type alone", () => {
    expect(queryKeys.recordLayouts.adjustment(ACME, "specimen")).not.toEqual(
      queryKeys.recordLayouts.adjustment(GLOBEX, "specimen"),
    );
    expect(queryKeys.recordLayouts.adjustment(ACME, "specimen")).toContain(ACME);
  });

  it("does not serve one tenant's arrangement to the other out of a shared cache", async () => {
    const client = freshClient();
    const wrapper = makeWrapper(client);

    mockedGet.mockResolvedValueOnce(ACME_ARRANGEMENT);
    actingAs(ACME);
    const acme = renderHook(() => useLayoutAdjustment("specimen"), { wrapper });
    await waitFor(() => expect(acme.result.current.data).toEqual(ACME_ARRANGEMENT));

    mockedGet.mockResolvedValueOnce(GLOBEX_ARRANGEMENT);
    actingAs(GLOBEX);
    const globex = renderHook(() => useLayoutAdjustment("specimen"), { wrapper });

    await waitFor(() => expect(globex.result.current.data).toEqual(GLOBEX_ARRANGEMENT));
    expect(globex.result.current.data).not.toEqual(ACME_ARRANGEMENT);
  });

  it("leaves the first tenant's arrangement intact when the second reads its own", async () => {
    const client = freshClient();
    const wrapper = makeWrapper(client);

    mockedGet.mockResolvedValueOnce(ACME_ARRANGEMENT);
    actingAs(ACME);
    const acme = renderHook(() => useLayoutAdjustment("specimen"), { wrapper });
    await waitFor(() => expect(acme.result.current.data).toEqual(ACME_ARRANGEMENT));

    mockedGet.mockResolvedValueOnce(GLOBEX_ARRANGEMENT);
    actingAs(GLOBEX);
    const globex = renderHook(() => useLayoutAdjustment("specimen"), { wrapper });
    await waitFor(() => expect(globex.result.current.data).toEqual(GLOBEX_ARRANGEMENT));

    expect(
      client.getQueryData(queryKeys.recordLayouts.adjustment(ACME, "specimen")),
    ).toEqual(ACME_ARRANGEMENT);
  });

  it("renders each tenant a different arrangement of the same description", async () => {
    const client = freshClient();
    const wrapper = makeWrapper(client);

    mockedGet.mockResolvedValueOnce(ACME_ARRANGEMENT);
    actingAs(ACME);
    const acme = renderHook(() => useLayoutAdjustment("specimen"), { wrapper });
    await waitFor(() => expect(acme.result.current.isSuccess).toBe(true));

    mockedGet.mockResolvedValueOnce(GLOBEX_ARRANGEMENT);
    actingAs(GLOBEX);
    const globex = renderHook(() => useLayoutAdjustment("specimen"), { wrapper });
    await waitFor(() => expect(globex.result.current.isSuccess).toBe(true));

    const columnsFor = (adjustment: LayoutAdjustment | null | undefined) =>
      applyAdjustment(LAYOUT, adjustment ?? null).list.columns.map((column) => column.field);

    expect(columnsFor(acme.result.current.data)).toEqual(["label", "site", "mass"]);
    expect(columnsFor(globex.result.current.data)).toEqual(["mass", "label", "owner", "site"]);
  });

  it("a refused read stays inline so the declared layout renders instead of the error page", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, throwOnError: true } },
    });
    mockedGet.mockRejectedValueOnce(new Error("Validation failed."));
    actingAs(ACME);

    const { result } = renderHook(() => useLayoutAdjustment("settings:storage-quarantine"), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it("asks for nothing at all until a tenant is known", () => {
    const wrapper = makeWrapper(freshClient());
    mockedSession.mockReturnValue({ data: null, status: "loading" });

    const { result } = renderHook(() => useLayoutAdjustment("specimen"), { wrapper });

    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});
