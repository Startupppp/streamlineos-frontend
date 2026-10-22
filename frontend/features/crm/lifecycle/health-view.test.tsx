import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { CustomerHealthRosterItem } from "@/types/crm/lifecycle";
import { HealthView } from "./health-view";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (message: string) => mockToastSuccess(message),
    error: (message: string) => mockToastError(message),
  },
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
    useCanState: (permission: PermissionKey) =>
      mockGranted.has(permission) ? "granted" : "denied",
    useAccess: () => ({ data: { scopes: {}, isOrgOwner: false }, refetch: jest.fn() }),
  };
});

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

const VIEW = "crm:customer-health:view";
const MANAGE = "crm:customer-health:manage";

const row = (over: Partial<CustomerHealthRosterItem> = {}): CustomerHealthRosterItem => ({
  customerHealthAssessmentId: "a-1",
  partyId: "party-1",
  partyName: "Kavya Textiles",
  score: 41,
  healthStatus: "critical",
  coverageBps: 8_000,
  weightsVersion: 3,
  computedAt: "2026-09-01T10:00:00.000Z",
  ...over,
});

function roster(rows: CustomerHealthRosterItem[]) {
  return { data: rows };
}

function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  }
  return render(<HealthView />, { wrapper: Wrapper });
}

function rosterParams(): Record<string, unknown> | undefined {
  const call = mockedGet.mock.calls
    .filter(([path]) => (path as string) === "/crm/customer-health")
    .at(-1);
  return call?.[1] as Record<string, unknown> | undefined;
}

describe("HealthView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGranted.clear();
    mockGranted.add(VIEW);
    mockGranted.add(MANAGE);
    mockedGet.mockImplementation((path: string) =>
      path.startsWith("/me/org-display")
        ? Promise.resolve({ currency: "INR", locale: "en-IN" })
        : Promise.resolve(roster([row()])),
    );
    mockedPost.mockResolvedValue({ data: {} });
  });

  it("recomputes one customer, on the route that names them", async () => {
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Kavya Textiles");

    await user.click(screen.getByRole("button", { name: /run/i }));

    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
    expect(mockedPost).toHaveBeenCalledWith(
      "/crm/customer-health/party-1/recompute",
      {},
    );
  });

  it("offers no recompute to somebody who may only read the roster", async () => {
    mockGranted.delete(MANAGE);
    renderView();
    await screen.findByText("Kavya Textiles");

    expect(screen.queryByRole("button", { name: /run/i })).not.toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("shows no empty action column to a reader either", async () => {
    mockGranted.delete(MANAGE);
    renderView();
    await screen.findByText("Kavya Textiles");

    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
  });

  it("reads nothing, and says why, without the view key", async () => {
    mockGranted.delete(VIEW);
    renderView();

    expect(
      await screen.findByText(/required permission for this section|You need the/i),
    ).toBeInTheDocument();
    expect(rosterParams()).toBeUndefined();
  });

  it("marks only the row being recomputed as running", async () => {
    mockedPost.mockImplementation(() => new Promise(() => undefined));
    const user = userEvent.setup();
    mockedGet.mockImplementation((path: string) =>
      path.startsWith("/me/org-display")
        ? Promise.resolve({ currency: "INR", locale: "en-IN" })
        : Promise.resolve(
            roster([row(), row({ customerHealthAssessmentId: "a-2", partyId: "party-2" })]),
          ),
    );
    renderView();
    await screen.findAllByText("Kavya Textiles");

    const buttons = screen.getAllByRole("button", { name: /^run$/i });
    await user.click(buttons[0]);

    expect(await screen.findByRole("button", { name: /running/i })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: /^run$/i })).toHaveLength(1);
  });

  it("says why a recompute failed, and lets it be tried again", async () => {
    mockedPost.mockRejectedValue(new Error("Scoring weights are being rebuilt"));
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Kavya Textiles");

    await user.click(screen.getByRole("button", { name: /run/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Scoring weights are being rebuilt"),
    );
    expect(screen.getByRole("button", { name: /^run$/i })).toBeEnabled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("asks for a band as a band", async () => {
    renderView();
    await waitFor(() => expect(rosterParams()).toBeDefined());

    expect(rosterParams()).toEqual({ band: "critical", limit: 100 });
  });

  it("asks for unscored customers as a flag, because unscored is not a band", async () => {
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Kavya Textiles");

    await user.click(screen.getByRole("tab", { name: /unscored/i }));

    await waitFor(() => expect(rosterParams()).toEqual({ unscored: true, limit: 100 }));
  });

  it("shows an unscored customer as unknown, never as a zero", async () => {
    mockedGet.mockImplementation((path: string) =>
      path.startsWith("/me/org-display")
        ? Promise.resolve({ currency: "INR", locale: "en-IN" })
        : Promise.resolve(roster([row({ score: null, healthStatus: null })])),
    );
    renderView();
    await screen.findByText("Kavya Textiles");

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Unscored")).toBeInTheDocument();
    expect(table.getByText("—")).toBeInTheDocument();
    expect(table.queryByText("0")).not.toBeInTheDocument();
  });

  it("says nothing matched this view rather than showing a bare table", async () => {
    mockedGet.mockImplementation((path: string) =>
      path.startsWith("/me/org-display")
        ? Promise.resolve({ currency: "INR", locale: "en-IN" })
        : Promise.resolve(roster([])),
    );
    renderView();

    expect(
      await screen.findByText(/no customers match this health view/i),
    ).toBeInTheDocument();
  });

  it("says the roster failed rather than reporting no customers", async () => {
    mockedGet.mockImplementation((path: string) =>
      path.startsWith("/me/org-display")
        ? Promise.resolve({ currency: "INR", locale: "en-IN" })
        : Promise.reject(new Error("upstream is down")),
    );
    renderView();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't load customer health/i);
    expect(screen.queryByText(/no customers match/i)).not.toBeInTheDocument();
  });
});
