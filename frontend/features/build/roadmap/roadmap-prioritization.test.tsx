import { render, screen } from "@testing-library/react";
import { RoadmapPriorityScore } from "./roadmap-priority-score";
import { RoadmapDeliveryProgress } from "./roadmap-delivery-progress";
import { roadmapItemSchema, parseRiceField } from "./roadmap-schema";
import { useRoadmapItemSignals } from "@/hooks/api/build/roadmap";
import type { RoadmapPrioritization, RoadmapSignals } from "@/hooks/api/build/roadmap";

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItemSignals: jest.fn(),
}));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCanState: jest.fn(() => "granted"),
}));

const mockUseSignals = useRoadmapItemSignals as unknown as jest.Mock;

function prioritization(overrides: Partial<RoadmapPrioritization> = {}): RoadmapPrioritization {
  return {
    method: "rice",
    score: null,
    isComplete: false,
    missingInputs: ["reach", "impact", "confidence", "effort"],
    unavailableReason: "missing_inputs",
    ...overrides,
  };
}

function signals(overrides: Partial<RoadmapSignals["delivery"]> = {}): RoadmapSignals {
  return {
    itemId: 7,
    prioritization: prioritization(),
    tierWeighting: {
      tierWeighted: false,
      tier: null,
      weight: null,
      weightedScore: null,
      unweightedReason: "score_unavailable",
      linkedFeedbackCount: 3,
      linkedAccountCount: 0,
      linkedRevenue: null,
      revenueKnownAccountCount: 0,
    },
    demand: { votes: 12, linkedFeedbackCount: 3, openLinkedFeedbackCount: 2 },
    delivery: {
      projectId: 4,
      epicTicketId: null,
      source: "project",
      linkedTicketCount: 4,
      countedTicketCount: 4,
      completedTicketCount: 3,
      progressPercent: 75,
      ...overrides,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RoadmapPriorityScore — a score is only shown when its inputs are all present", () => {
  it("renders the RICE score when every input is present — positive control", () => {
    render(
      <RoadmapPriorityScore
        prioritization={prioritization({ score: 600, isComplete: true, missingInputs: [], unavailableReason: null })}
      />,
    );
    expect(screen.getByText("RICE 600")).toBeInTheDocument();
  });

  it("renders Not scored instead of a number when an input is missing — negative control", () => {
    render(<RoadmapPriorityScore prioritization={prioritization()} />);
    expect(screen.getByText("Not scored")).toBeInTheDocument();
    expect(screen.queryByText(/^RICE /)).not.toBeInTheDocument();
  });

  it("names the effort problem rather than showing a divide-by-zero result", () => {
    render(
      <RoadmapPriorityScore
        prioritization={prioritization({ missingInputs: [], unavailableReason: "non_positive_effort" })}
      />,
    );
    expect(screen.getByText("Effort must be at least 1")).toBeInTheDocument();
  });

  it("renders nothing at all when the row predates scoring and carries no prioritization block", () => {
    const { container } = render(<RoadmapPriorityScore prioritization={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("RoadmapDeliveryProgress — progress from linked project work (BLD-07-008)", () => {
  it("renders the completed share when delivery work is linked — positive control", () => {
    mockUseSignals.mockReturnValue({ data: signals(), isLoading: false, isError: false });
    render(<RoadmapDeliveryProgress roadmapItemId={7} />);
    expect(screen.getByText(/3 of 4 tickets done/)).toBeInTheDocument();
    expect(screen.getByText(/Project/)).toBeInTheDocument();
  });

  it("states that progress cannot be calculated rather than rendering 0% when nothing is linked", () => {
    mockUseSignals.mockReturnValue({
      data: signals({ projectId: null, source: "none", linkedTicketCount: 0, countedTicketCount: 0, completedTicketCount: 0, progressPercent: null }),
      isLoading: false,
      isError: false,
    });
    render(<RoadmapDeliveryProgress roadmapItemId={7} />);
    expect(screen.getByText(/No delivery work is linked yet/)).toBeInTheDocument();
    expect(screen.queryByText(/tickets done/)).not.toBeInTheDocument();
  });

  it("shows the linked-feedback demand signal, which is the one live CRM-adjacent input", () => {
    mockUseSignals.mockReturnValue({ data: signals(), isLoading: false, isError: false });
    render(<RoadmapDeliveryProgress roadmapItemId={7} />);
    expect(screen.getByText(/3 linked feedback \(2 open\)/)).toBeInTheDocument();
    expect(screen.getByText(/12 votes/)).toBeInTheDocument();
  });

  it("renders nothing when the read errors, rather than an empty-looking zero state", () => {
    mockUseSignals.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { container } = render(<RoadmapDeliveryProgress roadmapItemId={7} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("roadmapItemSchema — RICE entry bounds", () => {
  const base = {
    title: "Ship it",
    description: "",
    status: "planned" as const,
    category: "",
    targetQuarter: "",
    isPublic: true,
    reach: "",
    impact: "",
    confidence: "",
    effort: "",
  };

  it("accepts an item with every RICE field left blank, so scoring stays optional", () => {
    expect(roadmapItemSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a fully scored item — positive control", () => {
    const parsed = roadmapItemSchema.safeParse({
      ...base,
      reach: "1200",
      impact: "3",
      confidence: "80",
      effort: "4",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a confidence above 100 because the score divides it by 100", () => {
    expect(roadmapItemSchema.safeParse({ ...base, confidence: "101" }).success).toBe(false);
  });

  it("rejects an effort of 0 so the form can never ask the server to divide by zero", () => {
    expect(roadmapItemSchema.safeParse({ ...base, effort: "0" }).success).toBe(false);
  });

  it("rejects an impact outside the 1-5 ladder", () => {
    expect(roadmapItemSchema.safeParse({ ...base, impact: "6" }).success).toBe(false);
  });

  it("rejects a non-numeric reach rather than silently sending NaN", () => {
    expect(roadmapItemSchema.safeParse({ ...base, reach: "lots" }).success).toBe(false);
  });
});

describe("parseRiceField — a blank field clears the stored value", () => {
  it("maps a blank string to null so an operator can retract a guess", () => {
    expect(parseRiceField("")).toBeNull();
    expect(parseRiceField("   ")).toBeNull();
  });

  it("maps a filled field to its number — positive control", () => {
    expect(parseRiceField("1200")).toBe(1200);
  });
});

describe("linked account revenue is shown as unknown rather than zero", () => {
  const SCORED = prioritization({
    score: 42,
    isComplete: true,
    missingInputs: [],
    unavailableReason: null,
  });

  function weighting(overrides: Partial<RoadmapSignals["tierWeighting"]> = {}) {
    return {
      tierWeighted: false as boolean,
      tier: null,
      weight: null,
      weightedScore: null,
      unweightedReason: "account_tier_unset" as const,
      linkedFeedbackCount: 2,
      linkedAccountCount: 2,
      linkedRevenue: null as number | null,
      revenueKnownAccountCount: 0,
      ...overrides,
    } as RoadmapSignals["tierWeighting"];
  }

  it("says revenue is unknown when no linked account carries a recorded value", () => {
    render(<RoadmapPriorityScore prioritization={SCORED} tierWeighting={weighting()} />);
    expect(screen.getByText("Revenue unknown")).toBeInTheDocument();
    expect(screen.queryByText(/₹0|\$0/)).not.toBeInTheDocument();
  });

  it("renders the total when the linked accounts do carry a value — positive control", () => {
    render(
      <RoadmapPriorityScore
        prioritization={SCORED}
        tierWeighting={weighting({ linkedRevenue: 1500, revenueKnownAccountCount: 2 })}
      />,
    );
    expect(screen.queryByText("Revenue unknown")).not.toBeInTheDocument();
    expect(screen.getByText(/1\.5K/)).toBeInTheDocument();
  });

  it("declares how many accounts the total covers when only some carry a value", () => {
    render(
      <RoadmapPriorityScore
        prioritization={SCORED}
        tierWeighting={weighting({ linkedRevenue: 900, revenueKnownAccountCount: 1 })}
      />,
    );
    expect(screen.getByText(/\(1\/2\)/)).toBeInTheDocument();
  });

  it("does not claim a partial total when every linked account is known", () => {
    render(
      <RoadmapPriorityScore
        prioritization={SCORED}
        tierWeighting={weighting({ linkedRevenue: 900, revenueKnownAccountCount: 2 })}
      />,
    );
    expect(screen.queryByText(/\(2\/2\)/)).not.toBeInTheDocument();
  });

  it("renders a zero total as zero, which is a different statement from unknown", () => {
    render(
      <RoadmapPriorityScore
        prioritization={SCORED}
        tierWeighting={weighting({ linkedRevenue: 0, revenueKnownAccountCount: 2 })}
      />,
    );
    expect(screen.queryByText("Revenue unknown")).not.toBeInTheDocument();
  });

  it("says nothing about revenue when no account is linked at all", () => {
    render(
      <RoadmapPriorityScore
        prioritization={SCORED}
        tierWeighting={weighting({ linkedAccountCount: 0, unweightedReason: "no_linked_account" })}
      />,
    );
    expect(screen.queryByText("Revenue unknown")).not.toBeInTheDocument();
  });
});
