import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LiveClassStop } from "@/types/crm/autonomy";
import { ClassStopsPanel } from "./class-stops-panel";

const mockStops = jest.fn();
const mockRelease = jest.fn();
const mockCan = jest.fn();

jest.mock("@/hooks/api/crm/autonomy", () => ({
  useLiveClassStops: () => mockStops(),
  useReleaseClassStop: () => mockRelease(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => mockCan() }));

const stop = (over: Partial<LiveClassStop> = {}): LiveClassStop => ({
  outboundClassStopId: "cs-1",
  partyId: "party-1",
  outboundClass: "nudge",
  outboundMessageId: "m-1",
  reason: "Asked us to stop",
  stoppedByUserId: "u-1",
  stoppedAt: "2026-08-24T12:00:00.000Z",
  ...over,
});

describe("ClassStopsPanel", () => {
  beforeEach(() => {
    mockCan.mockReturnValue(true);
    mockRelease.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
      variables: undefined,
    });
    mockStops.mockReturnValue({ data: [stop()] });
  });

  /** Same rule as the panel above it: a permanently empty box stops being read. */
  it("renders nothing when nothing is stopped", () => {
    mockStops.mockReturnValue({ data: [] });
    const { container } = render(<ClassStopsPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the class in words, because releasing is per class", () => {
    /**
     * Somebody who does not want chasing may still want the renewal
     * conversation. "nudge" is a database token; the operator is choosing what
     * this person will start hearing again.
     */
    render(<ClassStopsPanel />);
    expect(screen.getByText("Chasers")).toBeInTheDocument();
  });

  it("shows an unknown class as itself rather than as Unknown", () => {
    /**
     * The backend owns this vocabulary. A class added there must show up here
     * as itself — labelling it "Unknown" would hide a live stop from the only
     * screen that can lift it.
     */
    mockStops.mockReturnValue({ data: [stop({ outboundClass: "win_back" })] });
    render(<ClassStopsPanel />);
    expect(screen.getByText("win back")).toBeInTheDocument();
  });

  it("gives the reason, so a reviewer knows why before undoing it", () => {
    render(<ClassStopsPanel />);
    expect(screen.getByText(/Asked us to stop/)).toBeInTheDocument();
  });

  it("hides the release control from somebody who may only look", () => {
    /**
     * Releasing puts a customer back on a list they were taken off, so it is
     * the stronger key. The server refuses it too — this stops the button from
     * being offered and then failing.
     */
    mockCan.mockReturnValue(false);
    render(<ClassStopsPanel />);
    expect(screen.queryByRole("button", { name: /allow again/i })).not.toBeInTheDocument();
  });

  it("releases the stop it was clicked on", async () => {
    const mutate = jest.fn();
    mockRelease.mockReturnValue({ mutate, isPending: false, isError: false, variables: undefined });
    mockStops.mockReturnValue({ data: [stop(), stop({ outboundClassStopId: "cs-2" })] });

    render(<ClassStopsPanel />);
    await userEvent.click(screen.getAllByRole("button", { name: /allow again/i })[1]!);

    expect(mutate).toHaveBeenCalledWith({ outboundClassStopId: "cs-2" });
  });

  it("says so when a release fails", () => {
    mockRelease.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: true,
      error: new Error("That stop was already released."),
      variables: undefined,
    });

    render(<ClassStopsPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("That stop was already released.");
  });
});
