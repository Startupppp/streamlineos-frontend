import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockReplace = jest.fn();

jest.mock("@/hooks/api/build/roadmap", () => ({
  usePublicRoadmap: jest.fn(),
  usePublicVote: jest.fn(),
  useSubmitPublicFeedback: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ orgId: "rm_9fK2xQ7vBnL4tR8sW1yZ3aC6" }),
  useRouter: () => ({ replace: mockReplace }),
}));

import {
  usePublicRoadmap,
  usePublicVote,
  useSubmitPublicFeedback,
} from "@/hooks/api/build/roadmap";
import PublicRoadmapPage from "@/app/(public)/roadmap/[orgId]/page";

const mockUsePublicRoadmap = usePublicRoadmap as jest.MockedFunction<typeof usePublicRoadmap>;
const mockUsePublicVote = usePublicVote as jest.MockedFunction<typeof usePublicVote>;
const mockUseSubmitPublicFeedback = useSubmitPublicFeedback as jest.MockedFunction<typeof useSubmitPublicFeedback>;

const idleMutation = { mutate: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null };

const roadmapData = {
  orgName: "Acme Corp",
  roadmap: {
    planned: [{ id: 1, title: "New dashboard", description: null, status: "planned" as const, category: null, targetQuarter: null, votes: 3 }],
    in_progress: [],
    completed: [],
  },
  feedback: [],
  changelog: [],
};

beforeEach(() => {
  mockReplace.mockClear();
  mockUsePublicVote.mockReturnValue(idleMutation as unknown as ReturnType<typeof usePublicVote>);
  mockUseSubmitPublicFeedback.mockReturnValue(idleMutation as unknown as ReturnType<typeof useSubmitPublicFeedback>);
});

function setupWithData(overrides: object = {}) {
  mockUsePublicRoadmap.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof usePublicRoadmap>);
  return render(<PublicRoadmapPage />);
}

describe("PublicRoadmapPage — loading state", () => {
  it("renders a loading skeleton while the roadmap is loading", () => {
    setupWithData({ isLoading: true });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("PublicRoadmapPage — error / unavailable state", () => {
  it("shows 'Roadmap unavailable' when the board fails to load", () => {
    setupWithData({ isError: true });
    expect(screen.getByText("Roadmap unavailable")).toBeInTheDocument();
  });
});

describe("PublicRoadmapPage — empty state", () => {
  it("renders the org name heading when the board has no items", () => {
    setupWithData({ data: { ...roadmapData, roadmap: { planned: [], in_progress: [], completed: [] } } });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Acme Corp");
  });

  it("shows 'Nothing here yet' placeholders for empty columns", () => {
    setupWithData({ data: { ...roadmapData, roadmap: { planned: [], in_progress: [], completed: [] } } });
    const empties = screen.getAllByText("Nothing here yet");
    expect(empties.length).toBe(3);
  });
});

describe("PublicRoadmapPage — ready state", () => {
  it("renders roadmap items in the planned column", () => {
    setupWithData({ data: roadmapData });
    expect(screen.getByText("New dashboard")).toBeInTheDocument();
  });

  it("renders the org name as the heading", () => {
    setupWithData({ data: roadmapData });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Acme Corp");
  });
});

describe("PublicRoadmapPage — opaque publication addressing", () => {
  const PUBLIC_HANDLE = "rm_9fK2xQ7vBnL4tR8sW1yZ3aC6";

  it("renders the board without echoing the publication handle into the page", () => {
    const { container } = setupWithData({ data: roadmapData });
    expect(screen.getByText("New dashboard")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain(PUBLIC_HANDLE);
  });

  it("keeps the visitor on the handle they arrived on instead of rewriting it to a guessable slug", () => {
    setupWithData({ data: roadmapData });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Acme Corp");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
