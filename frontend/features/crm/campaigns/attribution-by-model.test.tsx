import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "@/lib/api-client";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { AttributionByModelReport } from "@/types/crm/campaigns";
import { AttributionByModel } from "./attribution-by-model";

/**
 * Radix's Select is driven by pointer capture and scrolls the chosen item into
 * view; jsdom implements neither, so the listbox never opens. Same shim as
 * `consider-outbound-panel.test.tsx`, for the same reason.
 */
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

/**
 * Only the gate is stubbed, not the query it wraps: `useGatedQuery` composes the
 * permission into `enabled`, and that composition is one of the things under
 * test. The real `permissionGate` is used so "resolved and refused" cannot be
 * confused with "not known yet".
 */
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

/**
 * CRM-P1-01. The by-model attribution read, held to the request it makes and to
 * the totals it is obliged to show beside the campaign rows.
 *
 * The wire half matters more than usual here. Five models exist on the server
 * and the screen's whole purpose is to let somebody pick one — a control that
 * looked right and kept asking for `linear` would show the same table under
 * five different headings, which is worse than not offering the choice.
 */

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

/**
 * The value shown under one of the four headline totals.
 *
 * Read through the `<dt>` rather than by its text, because the same amount
 * appears again in the campaign table below — and because the failure worth
 * catching is attributed and unattributable swapping slots, which a bare
 * `getByText` on the number would not notice at all.
 */
function totalFor(label: string): string {
  /* Scoped to `dt`: "Attributed" is also a column heading in the table below. */
  const term = screen.getByText(label, { selector: "dt" });
  const value = term.parentElement?.querySelector("dd");
  if (!value) throw new Error(`no value beside "${label}"`);
  return value.textContent ?? "";
}

/** Every attribution call this render made, newest last. */
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
    /**
     * The literal acceptance of the ticket. `attribution/first-touch` and
     * `attribution/last-touch` both exist and both answer 200 with a different
     * shape, so a wrong path here fails as a rendering oddity rather than as a
     * request error.
     */
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
    /**
     * Every other model ignores `halfLifeDays` entirely. Offering the control
     * beside them would tell an operator they had tuned something.
     */
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
    /**
     * `useGatedQuery` composes the permission into `enabled`. If that were ever
     * loosened the screen would look identical to a permitted one until the
     * server refused, which is a 403 in a log rather than a gate.
     */
    mockAllowed.mockReturnValue(false);
    renderPanel();

    await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    expect(attributionCalls()).toHaveLength(0);
  });

  it("shows what it could not attribute beside what it could", async () => {
    /**
     * The number that stops this being a vanity report. Attributed revenue on
     * its own reads as the whole of won revenue, and the gap is exactly the
     * part no campaign can claim.
     */
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
    /**
     * Dropping the row would move its share into "could not attribute" and
     * understate a campaign that really did the work.
     */
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
    /* The totals still stand: revenue was won, no campaign can claim it. */
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
