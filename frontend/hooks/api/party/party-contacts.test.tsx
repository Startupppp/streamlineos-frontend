import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import type { PermissionKey } from "@/lib/rbac/permissions";
import { useSavePartyContact } from "./party-contacts";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock("@/hooks/api/access", () => {
  const { permissionGate } =
    jest.requireActual<typeof import("@/lib/rbac/permission-gate")>("@/lib/rbac/permission-gate");
  return {
    usePermissionGate: (permission: PermissionKey) => permissionGate(permission, true, true),
    useCan: () => true,
    useAccess: () => ({ data: { scopes: {}, isOrgOwner: true }, refetch: jest.fn() }),
  };
});

const PARTY = "3f9a6b21-0c4d-4f7e-9a55-16b0c2d8e410";
const input = { firstName: "Ana", lastName: null, email: "ana@example.invalid", phone: null, title: null, isPrimary: false };

function contact(id: string, firstName: string) {
  return { partyContactId: id, partyId: PARTY, firstName, isPrimary: false };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const key = directoryAndOwnershipQueryKeys.party.contacts(PARTY);
  client.setQueryData(key, [contact("c1", "Old")]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSavePartyContact(PARTY), { wrapper });
  return { client, key, result };
}

describe("useSavePartyContact", () => {
  it("creates with the party id in the body and no null fields, appending the row", async () => {
    const { client, key, result } = setup();
    jest.mocked(apiClient.post).mockResolvedValueOnce(contact("c2", "Ana"));
    await act(async () => {
      await result.current.mutateAsync({ input });
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      `/party/parties/${PARTY}/contacts`,
      { firstName: "Ana", email: "ana@example.invalid", isPrimary: false, partyId: PARTY },
      undefined,
      expect.anything(),
    );
    expect(client.getQueryData<Array<{ partyContactId: string }>>(key)?.map((c) => c.partyContactId)).toEqual(["c1", "c2"]);
  });

  it("updates in place through PATCH /party/contacts/:id", async () => {
    const { client, key, result } = setup();
    jest.mocked(apiClient.patch).mockResolvedValueOnce(contact("c1", "Ana"));
    await act(async () => {
      await result.current.mutateAsync({ partyContactId: "c1", input });
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/party/contacts/c1", input, undefined, expect.anything());
    expect(client.getQueryData<Array<{ firstName: string }>>(key)?.map((c) => c.firstName)).toEqual(["Ana"]);
  });
});
