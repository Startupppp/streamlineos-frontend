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

/**
 * CRM-P1-19. Recomputing a customer's health is an authority of its own.
 *
 * The whole ticket is one sentence — the action stays behind
 * `crm:customer-health:manage` — and nothing asserted it. That is the kind of
 * thing that survives a refactor by accident and then does not: reading a
 * roster and telling the server to recompute a score are different acts, the
 * second writes, and the two keys sit next to each other in the catalogue.
 *
 * The band filter is the other quiet one. `unscored` is not a band — the server
 * takes it as its own flag — so a control that sent `band: "unscored"` would
 * return an empty list that reads as "every customer has been scored".
 */

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

/**
 * The params of the LATEST roster read — the second argument `apiClient.get`
 * takes. Latest rather than first because switching tab issues a second read
 * and the whole point of that assertion is what changed.
 */
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
    /**
     * The ticket, stated. Reading stored scores and telling the server to work
     * one out again are different acts; only the second writes.
     */
    mockGranted.delete(MANAGE);
    renderView();
    await screen.findByText("Kavya Textiles");

    expect(screen.queryByRole("button", { name: /run/i })).not.toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it("shows no empty action column to a reader either", async () => {
    /** A blank column is a control a reader can see and never use. */
    mockGranted.delete(MANAGE);
    renderView();
    await screen.findByText("Kavya Textiles");

    expect(screen.getAllByRole("columnheader")).toHaveLength(5);
  });

  it("reads nothing, and says why, without the view key", async () => {
    mockGranted.delete(VIEW);
    renderView();

    expect(await screen.findByText(/permission/i)).toBeInTheDocument();
    expect(rosterParams()).toBeUndefined();
  });

  it("marks only the row being recomputed as running", async () => {
    /**
     * One mutation hook serves every row, so a component keyed on `isPending`
     * alone would put every button in the table into "Running" and disable a
     * table the person was working down.
     */
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
    /**
     * `CustomerHealthBand` is healthy | at_risk | critical. Sending
     * `band: "unscored"` returns nothing, and an empty list on this tab reads
     * as "every customer has been scored" — the opposite of what it means.
     */
    const user = userEvent.setup();
    renderView();
    await screen.findByText("Kavya Textiles");

    await user.click(screen.getByRole("tab", { name: /unscored/i }));

    await waitFor(() => expect(rosterParams()).toEqual({ unscored: true, limit: 100 }));
  });

  it("shows an unscored customer as unknown, never as a zero", async () => {
    /** A score of 0 is the worst possible customer. Not knowing is not that. */
    mockedGet.mockImplementation((path: string) =>
      path.startsWith("/me/org-display")
        ? Promise.resolve({ currency: "INR", locale: "en-IN" })
        : Promise.resolve(roster([row({ score: null, healthStatus: null })])),
    );
    renderView();
    await screen.findByText("Kavya Textiles");

    /* Scoped to the table: "Unscored" is also the name of the tab that got here. */
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
