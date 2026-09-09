import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Deal } from "@/types/crm/deals";
import { ConsiderOutboundPanel } from "./consider-outbound-panel";

/**
 * Radix's Select is driven by pointer capture and scrolls the chosen item into
 * view; jsdom implements neither, so the listbox never opens and every
 * assertion below would fail for a reason that has nothing to do with this
 * component. Shimmed here rather than in the shared setup, because no other
 * suite in this repo drives a Select and a global shim would be a change to
 * every test's environment to serve one.
 */
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

const mockCompose = jest.fn();
const mockDeals = jest.fn();
const mockCan = jest.fn();

jest.mock("@/hooks/api/crm/autonomy", () => ({
  useComposeOutbound: () => mockCompose(),
}));
jest.mock("@/hooks/api/crm/deals", () => ({ useDeals: () => mockDeals() }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => mockCan() }));

const deal = (over: Partial<Deal> = {}): Deal =>
  ({
    id: 41,
    name: "Kavya Textiles renewal",
    partyId: "party-1",
    ...over,
  }) as Deal;

const gate = (over: Record<string, unknown> = {}) => ({
  access: { permission: "crm:deals:read", allowed: true, denied: false, pending: false },
  isLoading: false,
  data: [deal()],
  ...over,
});

describe("ConsiderOutboundPanel", () => {
  let mutate: jest.Mock;

  beforeEach(() => {
    mockCan.mockReturnValue(true);
    mutate = jest.fn();
    mockCompose.mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
      error: null,
    });
    mockDeals.mockReturnValue(gate());
  });

  it("renders nothing without the key the endpoint requires", () => {
    /** Same rule as the cold-outbound panel: a reviewer sees no gap, not a dead control. */
    mockCan.mockReturnValue(false);
    const { container } = render(<ConsiderOutboundPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says why it cannot offer anything when deals are unreadable", () => {
    mockDeals.mockReturnValue(
      gate({
        data: undefined,
        access: {
          permission: "crm:deals:read",
          allowed: false,
          denied: true,
          pending: false,
        },
      }),
    );
    render(<ConsiderOutboundPanel />);
    expect(
      screen.getByText(/you do not have permission to read deals/i),
    ).toBeInTheDocument();
  });

  it("hides deals with no customer record, and says how many", () => {
    /**
     * `loadComposeContext` looks the customer up by partyId and answers "not on
     * file" without one, so offering these would spend a click to be told what
     * the list already knows.
     */
    mockDeals.mockReturnValue(
      gate({ data: [deal(), deal({ id: 42, partyId: null })] }),
    );
    render(<ConsiderOutboundPanel />);
    expect(screen.getByText(/1 deal is not shown/i)).toBeInTheDocument();
  });

  it("sends the party, the deal as a string, and a key minted per press", async () => {
    const user = userEvent.setup();
    render(<ConsiderOutboundPanel />);

    await user.click(screen.getByRole("combobox", { name: /deal to consider/i }));
    await user.click(screen.getByRole("option", { name: /kavya textiles renewal/i }));
    await user.click(screen.getByRole("button", { name: /^consider$/i }));

    expect(mutate).toHaveBeenCalledTimes(1);
    const [variables] = mutate.mock.calls[0] as [
      { partyId: string; dealId: string; intentKey: string },
    ];
    expect(variables.partyId).toBe("party-1");
    /** The DTO takes a string; the deal's id is an integer. */
    expect(variables.dealId).toBe("41");
    expect(variables.intentKey).toEqual(expect.any(String));
    expect(variables.intentKey.length).toBeGreaterThan(0);
  });

  it("reports a refusal as the system working, not as a failure", async () => {
    /**
     * The whole reason this panel exists in this shape. `held: false` is the
     * most common honest answer, and rendering it as an error would report an
     * outage every time the system correctly declined to write to somebody.
     */
    mutate.mockImplementation((_vars, options) =>
      options.onSuccess({
        held: false,
        stage: "eligibility",
        reason: "They replied yesterday.",
      }),
    );
    const user = userEvent.setup();
    render(<ConsiderOutboundPanel />);

    await user.click(screen.getByRole("combobox", { name: /deal to consider/i }));
    await user.click(screen.getByRole("option", { name: /kavya textiles renewal/i }));
    await user.click(screen.getByRole("button", { name: /^consider$/i }));

    expect(screen.getByText("They replied yesterday.")).toBeInTheDocument();
    expect(screen.getByText(/nothing was sent/i)).toBeInTheDocument();
    /** The stage, because "should not write" and "could not write" differ. */
    expect(screen.getByText(/deciding whether to write at all/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("names the class the judge chose, which the caller never gets to pick", async () => {
    mutate.mockImplementation((_vars, options) =>
      options.onSuccess({
        held: true,
        outboundMessageId: "m-1",
        autonomyHoldId: "h-1",
        decisionId: "d-1",
        outboundClass: "check_in",
        holdUntil: "2026-09-09T12:30:00.000Z",
        windowSeconds: 900,
      }),
    );
    const user = userEvent.setup();
    render(<ConsiderOutboundPanel />);

    await user.click(screen.getByRole("combobox", { name: /deal to consider/i }));
    await user.click(screen.getByRole("option", { name: /kavya textiles renewal/i }));
    await user.click(screen.getByRole("button", { name: /^consider$/i }));

    expect(screen.getByText("Check-in")).toBeInTheDocument();
    expect(screen.getByText(/about 15 minutes/i)).toBeInTheDocument();
    /** No send-now, no skip-the-window: the hold is the only safeguard. */
    expect(screen.queryByRole("button", { name: /send now/i })).not.toBeInTheDocument();
  });
});
