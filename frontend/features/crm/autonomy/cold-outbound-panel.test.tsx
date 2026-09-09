import { fireEvent, render, screen } from "@testing-library/react";
import type { ColdOutboundOverview, SendingDomain } from "@/types/crm/autonomy";
import { ColdOutboundPanel } from "./cold-outbound-panel";

const mockOverview = jest.fn();
const mockRegister = jest.fn();
const mockVerify = jest.fn();
const mockWarmup = jest.fn();
const mockSetTrack = jest.fn();
const mockResume = jest.fn();
const mockCan = jest.fn();

jest.mock("@/hooks/api/crm/cold-outbound", () => ({
  useColdOutbound: () => mockOverview(),
  useRegisterSendingDomain: () => mockRegister(),
  useVerifySendingDomain: () => mockVerify(),
  useStartDomainWarmup: () => mockWarmup(),
  useSetColdTrack: () => mockSetTrack(),
  useResumeColdTrack: () => mockResume(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => mockCan() }));

const COLD_DOMAIN_ID = "0f2a7c1e-8b5d-4a10-9c3f-2d6e5b8a41c7";
const COLD_DOMAIN = "acme-outreach.com";

interface MutationStub {
  mutate: jest.Mock;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

function mutation(over: Partial<MutationStub> = {}): MutationStub {
  return { mutate: jest.fn(), isPending: false, isError: false, error: null, ...over };
}

/** The server nulls `verificationRecord` the moment a domain verifies. */
function domain(over: Partial<SendingDomain> = {}): SendingDomain {
  const sendingDomainId = over.sendingDomainId ?? COLD_DOMAIN_ID;
  const name = over.domain ?? COLD_DOMAIN;
  const verifiedAt = over.verifiedAt ?? null;
  return {
    sendingDomainId,
    domain: name,
    purpose: "cold",
    verifiedAt,
    warmupStartedAt: null,
    verificationRecord:
      verifiedAt === null
        ? {
            name: `_streamline-verify.${name}`,
            value: `streamline-verify=${sendingDomainId}`,
          }
        : null,
    ...over,
  };
}

function overview(over: Partial<ColdOutboundOverview> = {}): ColdOutboundOverview {
  return {
    enabled: false,
    enabledAt: null,
    pausedAt: null,
    pauseReason: null,
    domains: [],
    ...over,
  };
}

function readsAs(data: ColdOutboundOverview) {
  mockOverview.mockReturnValue({ data, isLoading: false, isError: false, error: null });
}

const verifiedDomain = () => domain({ verifiedAt: "2026-08-01T00:00:00.000Z" });
const warmedDomain = () =>
  domain({ verifiedAt: "2026-08-01T00:00:00.000Z", warmupStartedAt: "2026-08-05T00:00:00.000Z" });

function trackButton(): HTMLElement {
  return screen.getByRole("button", { name: /^turn (on|off)$/i });
}

describe("ColdOutboundPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCan.mockReturnValue(true);
    mockRegister.mockReturnValue(mutation());
    mockVerify.mockReturnValue(mutation());
    mockWarmup.mockReturnValue(mutation());
    mockSetTrack.mockReturnValue(mutation());
    mockResume.mockReturnValue(mutation());
    readsAs(overview());
  });

  /**
   * The overview carries the DNS token that proves domain ownership and the
   * reason the send path halted itself. Neither belongs to the `:view` key that
   * exists so a salesperson can watch the decision feed.
   */
  describe("without crm:autonomy:manage", () => {
    beforeEach(() => {
      mockCan.mockReturnValue(false);
    });

    it("renders nothing at all", () => {
      const { container } = render(<ColdOutboundPanel />);
      expect(container).toBeEmptyDOMElement();
    });

    it("leaks neither the pause reason nor the ownership token", () => {
      readsAs(
        overview({
          pausedAt: "2026-09-01T00:00:00.000Z",
          pauseReason: "Complaint rate crossed 0.3%",
          domains: [domain()],
        }),
      );
      render(<ColdOutboundPanel />);

      expect(screen.queryByText(/Complaint rate/)).not.toBeInTheDocument();
      expect(screen.queryByText(`streamline-verify=${COLD_DOMAIN_ID}`)).not.toBeInTheDocument();
    });
  });

  /** "Off" is a claim about the tenant's configuration, not a default to show while unsure. */
  it("does not call the track off while the overview is still loading", () => {
    mockOverview.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    render(<ColdOutboundPanel />);

    expect(screen.getByText("Cold outreach")).toBeInTheDocument();
    expect(screen.queryByText("Off")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /turn (on|off)/i })).not.toBeInTheDocument();
  });

  describe("turning the track on", () => {
    it("is refused with no sending domain, and says a domain is what is missing", () => {
      readsAs(overview());
      render(<ColdOutboundPanel />);

      expect(trackButton()).toHaveTextContent("Turn on");
      expect(trackButton()).toBeDisabled();
      expect(screen.getByText("Add a sending domain above first.")).toBeInTheDocument();
    });

    it("is refused while the domain is unverified, and names verification", () => {
      readsAs(overview({ domains: [domain()] }));
      render(<ColdOutboundPanel />);

      expect(trackButton()).toBeDisabled();
      expect(
        screen.getByText("Finish verifying and warming the domain above first."),
      ).toBeInTheDocument();
      expect(screen.getByText("Not verified yet.")).toBeInTheDocument();
    });

    it("is refused while a verified domain has not started its ramp, and names the ramp", () => {
      readsAs(overview({ domains: [verifiedDomain()] }));
      render(<ColdOutboundPanel />);

      expect(trackButton()).toBeDisabled();
      expect(
        screen.getByText("Finish verifying and warming the domain above first."),
      ).toBeInTheDocument();
      expect(screen.getByText(/Warm-up has not started/)).toBeInTheDocument();
    });

    it("is offered once the domain is verified and warming", () => {
      readsAs(overview({ domains: [warmedDomain()] }));
      render(<ColdOutboundPanel />);

      expect(trackButton()).toHaveTextContent("Turn on");
      expect(trackButton()).toBeEnabled();
      expect(screen.getByText("Everything it needs is in place.")).toBeInTheDocument();

      fireEvent.click(trackButton());
      expect(mockSetTrack().mutate).toHaveBeenCalledWith(true);
    });

    /**
     * `evaluateColdGate` refuses a cold send from the transactional domain, so a
     * warmed transactional domain must not read as the cold track's own.
     */
    it("does not accept the transactional domain as the cold one", () => {
      readsAs(
        overview({
          domains: [
            domain({
              purpose: "transactional",
              domain: "acme-invoices.com",
              verifiedAt: "2026-08-01T00:00:00.000Z",
              warmupStartedAt: "2026-08-05T00:00:00.000Z",
            }),
          ],
        }),
      );
      render(<ColdOutboundPanel />);

      expect(trackButton()).toBeDisabled();
      expect(screen.getByText("Add a sending domain above first.")).toBeInTheDocument();
      expect(screen.queryByText("acme-invoices.com")).not.toBeInTheDocument();
    });
  });

  /**
   * The one control in this file that must never be gated on configuration. A
   * tenant whose domain fell out of shape still has mail going out, and the only
   * thing that stops it is this button.
   */
  describe("turning the track off", () => {
    it("stays available when the cold domain has gone missing entirely", () => {
      readsAs(overview({ enabled: true, domains: [] }));
      render(<ColdOutboundPanel />);

      expect(trackButton()).toHaveTextContent("Turn off");
      expect(trackButton()).toBeEnabled();

      fireEvent.click(trackButton());
      expect(mockSetTrack().mutate).toHaveBeenCalledWith(false);
    });

    it("stays available when the domain is no longer verified", () => {
      readsAs(overview({ enabled: true, domains: [domain()] }));
      render(<ColdOutboundPanel />);

      expect(trackButton()).toHaveTextContent("Turn off");
      expect(trackButton()).toBeEnabled();
    });

    it("stays available when the domain never started warming", () => {
      readsAs(overview({ enabled: true, domains: [verifiedDomain()] }));
      render(<ColdOutboundPanel />);

      expect(trackButton()).toHaveTextContent("Turn off");
      expect(trackButton()).toBeEnabled();
    });

    it("stays available while the track is halted", () => {
      readsAs(
        overview({ enabled: true, pausedAt: "2026-09-01T00:00:00.000Z", domains: [domain()] }),
      );
      render(<ColdOutboundPanel />);

      expect(trackButton()).toHaveTextContent("Turn off");
      expect(trackButton()).toBeEnabled();
    });
  });

  describe("a halt the send path imposed", () => {
    const halted = () =>
      overview({
        enabled: true,
        pausedAt: "2026-09-01T00:00:00.000Z",
        pauseReason: "Complaint rate crossed 0.3%",
        domains: [warmedDomain()],
      });

    it("is said first, above the domain and the track switch", () => {
      readsAs(halted());
      render(<ColdOutboundPanel />);

      const notice = screen.getByText(/Sending stopped/);
      const domainRow = screen.getByText(COLD_DOMAIN);
      const track = trackButton();

      expect(notice.compareDocumentPosition(domainRow) & Node.DOCUMENT_POSITION_FOLLOWING)
        .toBeTruthy();
      expect(notice.compareDocumentPosition(track) & Node.DOCUMENT_POSITION_FOLLOWING)
        .toBeTruthy();
    });

    it("carries the send path's own reason, and what it means until cleared", () => {
      readsAs(halted());
      render(<ColdOutboundPanel />);

      const reason = screen.getByText(/Complaint rate crossed 0\.3%/);
      expect(reason).toHaveTextContent("Nothing goes out until you resume it.");
    });

    it("still says why nothing is going out when the server sent no reason", () => {
      readsAs({ ...halted(), pauseReason: null });
      render(<ColdOutboundPanel />);

      expect(
        screen.getByText(/Bounces or complaints crossed their limit/),
      ).toBeInTheDocument();
    });

    /** A halt is not the same state as somebody choosing not to run the track. */
    it("is reported beside an enabled track, not instead of it", () => {
      readsAs(halted());
      render(<ColdOutboundPanel />);

      expect(screen.getByText("On")).toBeInTheDocument();
      expect(screen.getByText("Halted")).toBeInTheDocument();
      expect(screen.getByText("Cold outreach is on")).toBeInTheDocument();
    });

    it("clears on its own control, which is not the track switch", () => {
      readsAs(halted());
      render(<ColdOutboundPanel />);

      fireEvent.click(screen.getByRole("button", { name: /resume sending/i }));
      expect(mockResume().mutate).toHaveBeenCalled();
      expect(mockSetTrack().mutate).not.toHaveBeenCalled();
    });

    it("survives turning the track off", () => {
      readsAs(halted());
      render(<ColdOutboundPanel />);

      fireEvent.click(trackButton());

      expect(mockSetTrack().mutate).toHaveBeenCalledWith(false);
      expect(mockResume().mutate).not.toHaveBeenCalled();
      expect(screen.getByText(/Sending stopped/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /resume sending/i })).toBeInTheDocument();
    });
  });

  describe("the domain row", () => {
    it("shows the exact TXT record to publish while unverified", () => {
      readsAs(overview({ domains: [domain()] }));
      render(<ColdOutboundPanel />);

      expect(screen.getByText(`_streamline-verify.${COLD_DOMAIN}`)).toBeInTheDocument();
      expect(screen.getByText(`streamline-verify=${COLD_DOMAIN_ID}`)).toBeInTheDocument();
    });

    it("drops the record once the domain is verified", () => {
      readsAs(overview({ domains: [verifiedDomain()] }));
      render(<ColdOutboundPanel />);

      expect(screen.queryByText(/Publish this TXT record/)).not.toBeInTheDocument();
      expect(screen.queryByText(`_streamline-verify.${COLD_DOMAIN}`)).not.toBeInTheDocument();
      expect(screen.queryByText(`streamline-verify=${COLD_DOMAIN_ID}`)).not.toBeInTheDocument();
    });

    /**
     * Verify and warm-up as two always-present buttons would offer an action the
     * server refuses with a 409; each state names only the step available now.
     */
    it("offers only the DNS check while unverified", () => {
      readsAs(overview({ domains: [domain()] }));
      render(<ColdOutboundPanel />);

      expect(screen.queryByRole("button", { name: /start warm-up/i })).not.toBeInTheDocument();
      expect(screen.queryByText("Ready")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /check dns/i }));
      expect(mockVerify().mutate).toHaveBeenCalledWith(COLD_DOMAIN_ID);
    });

    it("offers only the warm-up once verified", () => {
      readsAs(overview({ domains: [verifiedDomain()] }));
      render(<ColdOutboundPanel />);

      expect(screen.queryByRole("button", { name: /check dns/i })).not.toBeInTheDocument();
      expect(screen.queryByText("Ready")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /start warm-up/i }));
      expect(mockWarmup().mutate).toHaveBeenCalledWith(COLD_DOMAIN_ID);
    });

    it("offers nothing but a Ready badge once it is warming", () => {
      readsAs(overview({ domains: [warmedDomain()] }));
      render(<ColdOutboundPanel />);

      expect(screen.getByText("Ready")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /check dns/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /start warm-up/i })).not.toBeInTheDocument();
    });

    it("reports a refused DNS check where the check was asked for", () => {
      readsAs(overview({ domains: [domain()] }));
      mockVerify.mockReturnValue(
        mutation({
          isError: true,
          error: new Error("The TXT record does not carry this domain's value."),
        }),
      );
      render(<ColdOutboundPanel />);

      expect(
        screen.getByText("The TXT record does not carry this domain's value."),
      ).toBeInTheDocument();
    });
  });

  describe("registering the first domain", () => {
    it("will not send an empty domain", () => {
      render(<ColdOutboundPanel />);
      expect(screen.getByRole("button", { name: /add domain/i })).toBeDisabled();
    });

    it("registers it lowercased, trimmed, and as the cold purpose", () => {
      render(<ColdOutboundPanel />);

      fireEvent.change(screen.getByLabelText(/domain to send cold mail from/i), {
        target: { value: "  ACME-Outreach.com  " },
      });
      fireEvent.click(screen.getByRole("button", { name: /add domain/i }));

      expect(mockRegister().mutate).toHaveBeenCalledWith(
        { domain: COLD_DOMAIN, purpose: "cold" },
        expect.anything(),
      );
    });
  });

  /**
   * An empty panel would read as "nothing is configured", which is the wrong
   * thing to believe about a track that may be sending right now.
   */
  it("says the track's state could not be loaded rather than showing a blank panel", () => {
    mockOverview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Service unavailable while reading cold outreach"),
    });
    render(<ColdOutboundPanel />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Service unavailable while reading cold outreach");
    expect(alert).toHaveTextContent("whether cold outreach is running is unknown here");
    expect(screen.getByText("Cold outreach")).toBeInTheDocument();
  });

  /**
   * A failed read used to fall through to the registration form, because `data`
   * is undefined and so `cold` is null — inviting a tenant to add a second
   * sending domain beside one that may already exist. That is the "nothing is
   * configured" reading the alert is there to prevent, arriving anyway one line
   * below the alert saying otherwise.
   */
  it("offers no configuration controls when it could not read the state", () => {
    mockOverview.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Service unavailable while reading cold outreach"),
    });
    render(<ColdOutboundPanel />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Domain to send cold mail from/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add domain/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Turn on|Turn off/i })).not.toBeInTheDocument();
  });
});
