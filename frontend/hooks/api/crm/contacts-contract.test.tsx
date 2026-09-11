import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import {
  parseApiResponse,
  resolveContract,
  type ApiResponseLike,
  type ContractSource,
} from "@/lib/api-envelope";
import type { PermissionKey } from "@/lib/rbac/permissions";
import {
  contactDetailContract,
  contactListContract,
  contactRecordContract,
  contactRowContract,
} from "./contacts-schema";
import {
  useContactDetail,
  useContacts,
  useCreateContact,
  useDeleteContact,
  useRemoveContactRole,
  useUpdateContact,
} from "./contacts";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => {
  const { permissionGate } =
    jest.requireActual<typeof import("@/lib/rbac/permission-gate")>(
      "@/lib/rbac/permission-gate",
    );
  return {
    usePermissionGate: (permission: PermissionKey) => permissionGate(permission, true, true),
    useCan: () => true,
    useAccess: () => ({ data: { scopes: {}, isOrgOwner: true }, refetch: jest.fn() }),
  };
});

const LEGACY_ROW = {
  id: 41,
  orgId: "org_1",
  name: "Ana Rao",
  email: "ana@example.invalid",
  phone: null,
  title: "Head of Ops",
  department: null,
  company: "Northwind",
  organizationId: 3,
  linkedinUrl: null,
  twitterUrl: null,
  websiteUrl: null,
  avatarUrl: null,
  leadId: 7,
  dealId: null,
  tags: ["vip"],
  deletedAt: null,
  mergedIntoId: null,
  createdAt: "2026-01-05T09:30:00.000Z",
  updatedAt: "2026-02-01T11:00:00.000Z",
  notes: null,
};

const WIRE_ROW = {
  ...LEGACY_ROW,
  partyId: "3f9a6b21-0c4d-4f7e-9a55-16b0c2d8e410",
  lead: { id: 7, name: null },
  deal: null,
};

const WIRE_PAGE = { items: [WIRE_ROW], hasMore: false, nextCursor: null, total: 1 };

const WIRE_DETAIL = { ...WIRE_ROW, crmOrganization: { id: 3, name: null } };

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

async function parsedBy(source: ContractSource<unknown> | undefined, value: unknown) {
  const contract = await resolveContract(source);
  if (contract === undefined) throw new Error("the call carried no contract");
  return contract.safeParse(value);
}

async function acceptsNoContent(source: ContractSource<unknown> | undefined) {
  const contract = await resolveContract(source);
  if (contract === undefined) throw new Error("the call carried no contract");
  const noContent: ApiResponseLike = {
    ok: true,
    status: 204,
    statusText: "No Content",
    json: async () => null,
  };
  return parseApiResponse(noContent, contract, "/contacts/41");
}

describe("the contacts contracts describe what the backend sends", () => {
  it("parses a list page and keeps partyId, which the merge screens address contacts by", () => {
    const parsed = contactListContract.safeParse(WIRE_PAGE);

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error("unreachable");
    expect(parsed.data.items[0]?.partyId).toBe(WIRE_ROW.partyId);
  });

  it("accepts an association whose name is null", () => {
    expect(contactRowContract.safeParse(WIRE_ROW).success).toBe(true);
    expect(
      contactRowContract.safeParse({ ...WIRE_ROW, lead: null, deal: { id: 2, name: "Renewal" } })
        .success,
    ).toBe(true);
  });

  it("parses a page whose total the backend omitted", () => {
    const { total: _total, ...withoutTotal } = WIRE_PAGE;

    expect(contactListContract.safeParse(withoutTotal).success).toBe(true);
  });

  it("takes the two-field organisation the detail route sends, present or null", () => {
    expect(contactDetailContract.safeParse(WIRE_DETAIL).success).toBe(true);
    expect(
      contactDetailContract.safeParse({ ...WIRE_ROW, crmOrganization: null }).success,
    ).toBe(true);
  });

  it("requires crmOrganization on the detail row, because the route always sends the key", () => {
    expect(contactDetailContract.safeParse(WIRE_ROW).success).toBe(false);
  });

  it("parses the legacy row POST and PATCH return, which carries no partyId", () => {
    expect(contactRecordContract.safeParse(LEGACY_ROW).success).toBe(true);
    expect(contactRowContract.safeParse(LEGACY_ROW).success).toBe(false);
  });
});

describe("each contacts call carries the contract for its own route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(apiClient.get).mockResolvedValue(WIRE_PAGE);
    jest.mocked(apiClient.post).mockResolvedValue(LEGACY_ROW);
    jest.mocked(apiClient.patch).mockResolvedValue(LEGACY_ROW);
    jest.mocked(apiClient.delete).mockResolvedValue(undefined);
  });

  it("reads the list under a contract that parses the list page", async () => {
    renderHook(() => useContacts({ limit: 25 }), { wrapper: wrapper() });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const parsed = await parsedBy(jest.mocked(apiClient.get).mock.calls[0]?.[3], WIRE_PAGE);
    expect(parsed.success).toBe(true);
  });

  it("reads the detail under a contract that parses the detail row", async () => {
    renderHook(() => useContactDetail(41), { wrapper: wrapper() });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    const parsed = await parsedBy(jest.mocked(apiClient.get).mock.calls[0]?.[3], WIRE_DETAIL);
    expect(parsed.success).toBe(true);
  });

  it("creates under a contract that parses the legacy row, not the projection", async () => {
    const { result } = renderHook(() => useCreateContact(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync({ name: "Ana Rao" });
    });

    const parsed = await parsedBy(jest.mocked(apiClient.post).mock.calls[0]?.[3], LEGACY_ROW);
    expect(parsed.success).toBe(true);
  });

  it("updates under a contract that parses the legacy row", async () => {
    const { result } = renderHook(() => useUpdateContact(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: 41, title: "COO" });
    });

    const parsed = await parsedBy(jest.mocked(apiClient.patch).mock.calls[0]?.[3], LEGACY_ROW);
    expect(parsed.success).toBe(true);
  });

  it("deletes a contact under a contract a 204 satisfies", async () => {
    const { result } = renderHook(() => useDeleteContact(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync(41);
    });

    await expect(
      acceptsNoContent(jest.mocked(apiClient.delete).mock.calls[0]?.[3]),
    ).resolves.toBeUndefined();
  });

  it("removes a contact role under a contract a 204 satisfies", async () => {
    const { result } = renderHook(() => useRemoveContactRole(), { wrapper: wrapper() });

    await act(async () => {
      await result.current.mutateAsync({ contactId: 41, roleId: "role-1" });
    });

    await expect(
      acceptsNoContent(jest.mocked(apiClient.delete).mock.calls[0]?.[3]),
    ).resolves.toBeUndefined();
  });
});
