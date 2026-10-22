import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "@/lib/api-client";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type {
  EffectiveRepairPolicy,
  RepairPoliciesResponse,
} from "@/types/crm/autonomy";
import { RepairPoliciesPanel } from "./repair-policies-panel";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGranted = new Set<string>();
jest.mock("@/hooks/api/access", () => {
  const { permissionGate } =
    jest.requireActual<typeof import("@/lib/rbac/permission-gate")>(
      "@/lib/rbac/permission-gate",
    );
  return {
    usePermissionGate: (permission: PermissionKey) =>
      permissionGate(permission, mockGranted.has(permission), true),
    useCan: (permission: PermissionKey) => mockGranted.has(permission),
    useAccess: () => ({ data: { scopes: {}, isOrgOwner: false }, refetch: jest.fn() }),
  };
});

const mockedGet = apiClient.get as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;


const WHITESPACE: EffectiveRepairPolicy = {
  repairClass: "email.whitespace",
  findingKind: "email.malformed",
  field: "email",
  conservative: false,
  reversibility: "instant",
  description: "Remove stray spaces from an email address",
  enabled: false,
  source: "default",
  reason: null,
  effective: false,
};

const DOT_EDGE: EffectiveRepairPolicy = {
  repairClass: "email.domain-dot-edge",
  findingKind: "email.malformed",
  field: "email",
  conservative: true,
  reversibility: "instant",
  description: "Remove a dot from the edge of a domain",
  enabled: true,
  source: "default",
  reason: null,
  effective: true,
};

function policies(over: Partial<RepairPoliciesResponse> = {}): RepairPoliciesResponse {
  return {
    autonomy: { allowed: true, decidedBy: "tenant", reason: null },
    classes: [WHITESPACE, DOT_EDGE],
    ...over,
  };
}

function switchFor(description: string): HTMLElement {
  return screen.getByRole("switch", { name: description });
}

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<RepairPoliciesPanel />, { wrapper: Wrapper });
}

describe("RepairPoliciesPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGranted.clear();
    mockGranted.add("crm:autonomy:view");
    mockGranted.add("crm:autonomy:repair");
    mockedGet.mockResolvedValue(policies());
    mockedPatch.mockResolvedValue(policies());
  });

  it("reads the policies from the endpoint that owns them", async () => {
    renderPanel();

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith(
        "/crm/autonomy/repair-policies",
        undefined,
        expect.anything(),
      ),
    );
  });

  it("grants one class, naming only that class", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(WHITESPACE.description);

    await user.click(switchFor(WHITESPACE.description));

    await waitFor(() => expect(mockedPatch).toHaveBeenCalledTimes(1));
    expect(mockedPatch).toHaveBeenCalledWith(
      "/crm/autonomy/repair-policies",
      { repairClass: "email.whitespace", enabled: true },
      { headers: { "Idempotency-Key": expect.any(String) } },
    );
  });

  it("takes one back", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(DOT_EDGE.description);

    await user.click(switchFor(DOT_EDGE.description));

    await waitFor(() => expect(mockedPatch).toHaveBeenCalledTimes(1));
    const [, body] = mockedPatch.mock.calls[0] as [string, { enabled: boolean }];
    expect(body.enabled).toBe(false);
  });

  it("lets a reader look without letting them change anything", async () => {
    mockGranted.delete("crm:autonomy:repair");
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(WHITESPACE.description);

    expect(switchFor(WHITESPACE.description)).toBeDisabled();
    await user.click(switchFor(WHITESPACE.description));
    expect(mockedPatch).not.toHaveBeenCalled();
  });

  it("says what is allowed is unknown when the read fails, rather than showing none", async () => {
    mockedGet.mockRejectedValue(new Error("boom"));
    renderPanel();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/currently allowed to repair is unknown/i);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("says the kill switch stopped everything, and why", async () => {
    mockedGet.mockResolvedValue(
      policies({
        autonomy: { allowed: false, decidedBy: "platform", reason: "billing on hold" },
        classes: [{ ...DOT_EDGE, effective: false }],
      }),
    );
    renderPanel();

    expect(await screen.findByText(/repairs are switched off entirely/i)).toHaveTextContent(
      "billing on hold",
    );
    expect(switchFor(DOT_EDGE.description)).toBeChecked();
  });

  it("distinguishes a class nobody chose from one a tenant decided", async () => {
    mockedGet.mockResolvedValue(
      policies({
        classes: [
          WHITESPACE,
          { ...DOT_EDGE, source: "tenant", reason: "Approved by data governance" },
        ],
      }),
    );
    renderPanel();

    expect(await screen.findByText("Off unless you ask for it.")).toBeInTheDocument();
    expect(screen.getByText("Approved by data governance")).toBeInTheDocument();
  });

  it("reports a refused change against the state that still stands", async () => {
    mockedPatch.mockRejectedValue(new Error("Repairs are switched off for this org"));
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(WHITESPACE.description);

    await user.click(switchFor(WHITESPACE.description));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Repairs are switched off for this org");
    expect(alert).toHaveTextContent(/this fix is still not allowed/i);
    expect(switchFor(WHITESPACE.description)).not.toBeChecked();
  });

  it("blames only the row that failed", async () => {
    mockedPatch.mockRejectedValue(new Error("Refused"));
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(WHITESPACE.description);

    await user.click(switchFor(WHITESPACE.description));

    await screen.findByRole("alert");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});
