import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useCan, useScope } from "@/hooks/api/access";
import type { AccessResponse } from "@/types/access";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
  setAutoSignOutSuppressed: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
  }),
}));

const mockedGet = apiClient.get as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function givenAccess(overrides: Partial<AccessResponse> = {}) {
  mockedGet.mockResolvedValue({
    scopes: {},
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: {},
    ...overrides,
  } satisfies AccessResponse);
}

async function renderAccess<T>(hook: () => T) {
  const { result } = renderHook(hook, { wrapper });
  await waitFor(() => expect(mockedGet).toHaveBeenCalled());
  return result;
}

describe("useCan", () => {
  beforeEach(() => jest.clearAllMocks());

  it("answers yes for a permission the person holds at a narrowed scope", async () => {
    givenAccess({ scopes: { "crm:contacts:view": "team" } });
    const result = await renderAccess(() => useCan("crm:contacts:view"));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("answers no for a permission absent from the person's scopes", async () => {
    givenAccess({ scopes: { "crm:contacts:view": "all" } });
    const result = await renderAccess(() => useCan("crm:contacts:delete"));
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it("answers yes for an org owner holding nothing explicitly", async () => {
    givenAccess({ isOrgOwner: true, scopes: {} });
    const result = await renderAccess(() => useCan("crm:contacts:view"));
    await waitFor(() => expect(result.current).toBe(true));
  });
});

describe("useScope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the scope the permission was granted at", async () => {
    givenAccess({ scopes: { "crm:contacts:view": "team" } });
    const result = await renderAccess(() => useScope("crm:contacts:view"));
    await waitFor(() => expect(result.current).toBe("team"));
  });

  it("returns none for a permission the person does not hold", async () => {
    givenAccess({ scopes: {} });
    const result = await renderAccess(() => useScope("crm:contacts:view"));
    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(result.current).toBe("none");
  });

  it("returns all for an org owner", async () => {
    givenAccess({ isOrgOwner: true, scopes: {} });
    const result = await renderAccess(() => useScope("crm:contacts:view"));
    await waitFor(() => expect(result.current).toBe("all"));
  });
});
