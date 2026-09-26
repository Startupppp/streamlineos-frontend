import { render, screen } from "@testing-library/react";
import { RoadmapDeliveryProgress } from "./roadmap-delivery-progress";
import { useCanState } from "@/hooks/api/access";
import { useRoadmapItemSignals } from "@/hooks/api/build/roadmap";

jest.mock("@/hooks/api/access", () => ({
  useCanState: jest.fn(),
}));

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItemSignals: jest.fn(),
}));

jest.mock("./roadmap-constants", () => ({
  ROADMAP_DELIVERY_SOURCE_LABEL: {
    epic_ticket: "Epic",
    project: "Project",
    none: "Not linked to delivery work",
  },
}));

jest.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress-bar" data-value={value} />
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

const mockUseCanState = useCanState as jest.Mock;
const mockUseRoadmapItemSignals = useRoadmapItemSignals as jest.Mock;

const SIGNALS_READY = {
  data: {
    delivery: {
      source: "epic_ticket",
      progressPercent: 60,
      completedTicketCount: 3,
      countedTicketCount: 5,
    },
    demand: {
      linkedFeedbackCount: 4,
      openLinkedFeedbackCount: 2,
      votes: 18,
    },
  },
  isLoading: false,
  isError: false,
};

const SIGNALS_LOADING = { data: undefined, isLoading: true, isError: false };
const SIGNALS_ERROR = { data: undefined, isLoading: false, isError: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCanState.mockReturnValue("granted");
  mockUseRoadmapItemSignals.mockReturnValue(SIGNALS_READY);
});

describe("RoadmapDeliveryProgress — sub-panel hidden on denial (not a full-page surface)", () => {
  it("returns nothing when access is denied — positive control: progress panel absent so the parent card is uncluttered", () => {
    mockUseCanState.mockReturnValue("denied");
    mockUseRoadmapItemSignals.mockReturnValue(SIGNALS_LOADING);
    const { container } = render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns nothing when access is still loading — positive control: no flash of denied inside the card", () => {
    mockUseCanState.mockReturnValue("loading");
    mockUseRoadmapItemSignals.mockReturnValue(SIGNALS_LOADING);
    const { container } = render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a skeleton while the signals query is in flight — positive control: skeleton present", () => {
    mockUseRoadmapItemSignals.mockReturnValue(SIGNALS_LOADING);
    render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders a skeleton while loading — negative: progress bar absent during load", () => {
    mockUseRoadmapItemSignals.mockReturnValue(SIGNALS_LOADING);
    render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(screen.queryByTestId("progress-bar")).not.toBeInTheDocument();
  });

  it("returns nothing when the signals query errors — positive control: no error banner inside the card", () => {
    mockUseRoadmapItemSignals.mockReturnValue(SIGNALS_ERROR);
    const { container } = render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the progress bar when data is present — positive control: progress panel visible", () => {
    render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toHaveAttribute("data-value", "60");
  });

  it("shows the delivery source label from the signals data — positive control: Epic label present", () => {
    render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(screen.getByText("Epic")).toBeInTheDocument();
  });

  it("shows ticket counts from the signals data — positive control: count text present", () => {
    render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(screen.getByText(/3 of 5 tickets done/)).toBeInTheDocument();
  });

  it("shows demand stats from the signals data — positive control: vote count present", () => {
    render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(screen.getByText(/18 votes/)).toBeInTheDocument();
  });

  it("disables the signals query when denied so no request is made for an inaccessible resource", () => {
    mockUseCanState.mockReturnValue("denied");
    mockUseRoadmapItemSignals.mockReturnValue(SIGNALS_LOADING);
    render(<RoadmapDeliveryProgress roadmapItemId={7} />);
    expect(mockUseRoadmapItemSignals).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ enabled: false }),
    );
  });

  it("enables the signals query when access is granted", () => {
    render(<RoadmapDeliveryProgress roadmapItemId={7} />);
    expect(mockUseRoadmapItemSignals).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ enabled: true }),
    );
  });
});

describe("RoadmapDeliveryProgress — null delivery progress", () => {
  it("shows the no-delivery-work message when progressPercent is null — positive control: explanatory text present", () => {
    mockUseRoadmapItemSignals.mockReturnValue({
      ...SIGNALS_READY,
      data: {
        ...SIGNALS_READY.data,
        delivery: { ...SIGNALS_READY.data.delivery, progressPercent: null },
      },
    });
    render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(
      screen.getByText(/No delivery work is linked yet/),
    ).toBeInTheDocument();
  });

  it("hides the progress bar when progressPercent is null — negative control: bar absent", () => {
    mockUseRoadmapItemSignals.mockReturnValue({
      ...SIGNALS_READY,
      data: {
        ...SIGNALS_READY.data,
        delivery: { ...SIGNALS_READY.data.delivery, progressPercent: null },
      },
    });
    render(<RoadmapDeliveryProgress roadmapItemId={1} />);
    expect(screen.queryByTestId("progress-bar")).not.toBeInTheDocument();
  });
});
