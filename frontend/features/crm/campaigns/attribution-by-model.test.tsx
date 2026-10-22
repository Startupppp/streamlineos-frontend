import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "@/lib/api-client";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { AttributionByModelReport } from "@/types/crm/campaigns";
import { AttributionByModel } from "./attribution-by-model";

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockAllowed = jest.fn<boolean, []>();
jest.mock("@/hooks/api/access", () => {
  const { permissionGate } =
    jest.requireActual<typeof import("@/lib/rbac/permission-gate")>(
      "@/lib/rbac/permission-gate",
    );
  return {
    usePermissionGate: (permission: PermissionKey) =>
      permissionGate(permission, mockAllowed(), true),
  };
});

const mockedGet = apiClient.get as jest.Mock;


const REPORT: AttributionByModelReport = {
  model: "linear",
  modelDescription: "Every touch on a won deal takes an equal share.",
  halfLifeDays: 30,
  dealsConsidered: 12,
  dealsAttributed: 9,
  dealsWithoutTouches: 3,
  truncated: false,
  totalRevenueMinor: 500_000,
  attributedRevenueMinor: 300_000,
  unattributableRevenueMinor: 200_000,
  campaigns: [
    {
      campaignId: 1,
      campaignName: "Diwali push",
      campaignArchived: false,
      touchCount: 14,
      dealCount: 4,
      attributedRevenueMinor: 300_000,
    },
  ],
  channels: [],
};

function report(over: Partial<AttributionByModelReport> = {}): AttributionByModelReport {
  return { ...REPORT, ...over };
}

function respondWith(payload: AttributionByModelReport | Error) {
  mockedGet.mockImplementation((path: string) => {
    if (path.startsWith("/me/org-display")) {
      return Promise.resolve({ currency: "INR", locale: "en-IN" });
    }
    return payload instanceof Error ? Promise.reject(payload) : Promise.resolve(payload);
  });
}

function totalFor(label: string): string {
  const term = screen.getByText(label, { selector: "dt" });
  const value = term.parentElement?.querySelector("dd");
  if (!value) throw new Error(`no value beside "${label}"`);
  return value.textContent ?? "";
}

function attributionCalls(): string[] {
  return mockedGet.mock.calls
    .map(([path]) => path as string)
    .filter((path) => path.includes("/crm/campaigns/attribution"));
}

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<AttributionByModel />, { wrapper: Wrapper });
}

describe("AttributionByModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAllowed.mockReturnValue(true);
    respondWith(report());
  });

  it("asks the by-model endpoint, not one of the single-touch reports", async () => {
    renderPanel();

    await waitFor(() => expect(attributionCalls()).toHaveLength(1));
    expect(attributionCalls()[0]).toBe(
      "/crm/campaigns/attribution/by-model?model=linear&halfLifeDays=30",
    );
  });

  it("re-asks under the model that was chosen", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Diwali push");

    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(screen.getByRole("option", { name: "Position based" }));

    await waitFor(() => expect(attributionCalls()).toHaveLength(2));
    expect(attributionCalls()[1]).toContain("model=position_based");
  });

  it("offers the half-life only for the one model that reads it, and sends it", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Diwali push");
    expect(screen.queryByText(/half-life/i)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(screen.getByRole("option", { name: "Time decay" }));
    await screen.findByText("30-day half-life");

    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getByRole("option", { name: "7-day half-life" }));

    await waitFor(() =>
      expect(attributionCalls().at(-1)).toBe(
        "/crm/campaigns/attribution/by-model?model=time_decay&halfLifeDays=7",
      ),
    );
  });

  it("makes no request at all without the reporting key", async () => {
    mockAllowed.mockReturnValue(false);
    renderPanel();

    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(attributionCalls()).toHaveLength(0);
  });

  it("shows what it could not attribute beside what it could", async () => {
    renderPanel();
    await screen.findByText("Diwali push");

    expect(totalFor("Won revenue")).toBe("₹5,000.00");
    expect(totalFor("Attributed")).toBe("₹3,000.00");
    expect(totalFor("Could not attribute")).toBe("₹2,000.00");
    expect(totalFor("Won deals with no touches")).toBe("3 of 12");
  });

  it("takes the model's description from the response rather than keeping its own", async () => {
    renderPanel();
    expect(
      await screen.findByText("Every touch on a won deal takes an equal share."),
    ).toBeInTheDocument();
  });

  it("says the numbers are a floor when the window was truncated", async () => {
    respondWith(report({ truncated: true }));
    renderPanel();

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent(/a floor, not a total/i);
  });

  it("claims no floor when the whole window was read", async () => {
    renderPanel();
    await screen.findByText("Diwali push");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps an archived campaign that still holds credit, and marks it", async () => {
    respondWith(
      report({
        campaigns: [
          { ...REPORT.campaigns[0], campaignName: "Old webinar", campaignArchived: true },
        ],
      }),
    );
    renderPanel();

    expect(await screen.findByText("Old webinar")).toBeInTheDocument();
    expect(screen.getByText("archived")).toBeInTheDocument();
  });

  it("distinguishes no touches from no won revenue", async () => {
    respondWith(report({ campaigns: [] }));
    renderPanel();

    expect(
      await screen.findByText("No touches on any won deal in this window."),
    ).toBeInTheDocument();
    expect(totalFor("Won revenue")).toBe("₹5,000.00");
  });

  it("says the arithmetic failed rather than showing an empty table", async () => {
    respondWith(new Error("boom"));
    renderPanel();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not work out attribution/i,
    );
  });
});
