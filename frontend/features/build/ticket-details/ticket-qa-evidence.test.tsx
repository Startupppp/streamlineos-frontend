import { render, screen } from "@testing-library/react";
import type { AccessState } from "@/lib/rbac/gate";
import { TicketQaEvidence } from "./ticket-qa-evidence";

let mockAccess: AccessState = "granted";
let mockBugResult: { data: unknown; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
const useBugSpy = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCanState: (): AccessState => mockAccess,
}));

jest.mock("@/hooks/api/build/bugs", () => ({
  useBug: (
    projectId?: number,
    bugId?: number,
    options?: { enabled?: boolean },
  ) => {
    useBugSpy(projectId, bugId, options);
    return mockBugResult;
  },
}));

const fullEvidence = {
  id: 7,
  severity: "blocker",
  qaState: "ready_for_qa",
  stepsToReproduce: "Open the board and drag a card",
  expectedResult: "The card moves",
  actualResult: "The card snaps back",
  environment: "staging",
  browserDevice: "Firefox 141 / Windows",
  reopenCount: 2,
};

beforeEach(() => {
  mockAccess = "granted";
  mockBugResult = { data: fullEvidence, isLoading: false };
  useBugSpy.mockClear();
});

describe("TicketQaEvidence rendering", () => {
  it("renders every QA evidence field for a bug ticket", () => {
    render(
      <TicketQaEvidence projectId={1} ticketId={7} ticketType="BUG" />,
    );

    expect(screen.getByText("QA evidence")).toBeInTheDocument();
    expect(screen.getByText("blocker")).toBeInTheDocument();
    expect(screen.getByText("Ready for QA")).toBeInTheDocument();
    expect(
      screen.getByText("Open the board and drag a card"),
    ).toBeInTheDocument();
    expect(screen.getByText("The card moves")).toBeInTheDocument();
    expect(screen.getByText("The card snaps back")).toBeInTheDocument();
    expect(screen.getByText("staging")).toBeInTheDocument();
    expect(screen.getByText("Firefox 141 / Windows")).toBeInTheDocument();
    expect(screen.getByText("Reopened 2x")).toBeInTheDocument();
  });

  it("reports that nothing was recorded when a bug carries no evidence", () => {
    mockBugResult = {
      data: { id: 7, severity: null, qaState: null },
      isLoading: false,
    };

    render(<TicketQaEvidence projectId={1} ticketId={7} ticketType="BUG" />);

    expect(screen.getByText("No QA evidence recorded.")).toBeInTheDocument();
  });

  it("shows a skeleton rather than an empty state while the evidence loads", () => {
    mockBugResult = { data: undefined, isLoading: true };

    const { container } = render(
      <TicketQaEvidence projectId={1} ticketId={7} ticketType="BUG" />,
    );

    expect(screen.queryByText("No QA evidence recorded.")).toBeNull();
    expect(container.querySelector(".skeleton-shimmer")).toBeTruthy();
  });
});

describe("TicketQaEvidence gating", () => {
  it("renders nothing for a ticket that is not a bug", () => {
    const { container } = render(
      <TicketQaEvidence projectId={1} ticketId={7} ticketType="TASK" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("does not request evidence for a ticket that is not a bug", () => {
    render(<TicketQaEvidence projectId={1} ticketId={7} ticketType="TASK" />);

    expect(useBugSpy).toHaveBeenCalledWith(1, 7, { enabled: false });
  });

  it("renders nothing when the viewer cannot see bugs", () => {
    mockAccess = "denied";

    const { container } = render(
      <TicketQaEvidence projectId={1} ticketId={7} ticketType="BUG" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("does not claim absence of evidence while access is still resolving", () => {
    mockAccess = "loading";

    render(<TicketQaEvidence projectId={1} ticketId={7} ticketType="BUG" />);

    expect(screen.queryByText("No QA evidence recorded.")).toBeNull();
  });
});
