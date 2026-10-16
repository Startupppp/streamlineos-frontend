import { fireEvent, render, screen } from "@testing-library/react";
import { KbResearchBriefsPageContent } from "./kb-research-briefs-page-content";
import { useKbResearchBriefs } from "@/hooks/api/kb/research-briefs";
import { usePageState } from "@/hooks/api/use-page-state";

jest.mock("@/hooks/api/kb/research-briefs", () => ({
  useKbResearchBriefs: jest.fn(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(() => ({ kind: "ready" })),
}));

jest.mock("./kb-research-brief-form", () => ({
  KbResearchBriefForm: () => <div>Research brief form</div>,
}));

jest.mock("./kb-research-brief-card", () => ({
  KbResearchBriefCard: ({ brief }: { brief: { topic: string } }) => <div>{brief.topic}</div>,
}));

const useKbResearchBriefsMock = jest.mocked(useKbResearchBriefs);
const usePageStateMock = jest.mocked(usePageState);

function mockList(overrides: Record<string, unknown> = {}) {
  useKbResearchBriefsMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    isFetchNextPageError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  } as unknown as ReturnType<typeof useKbResearchBriefs>);
}

describe("KbResearchBriefsPageContent states", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePageStateMock.mockReturnValue({ kind: "ready" });
  });

  it("shows denial without the create form or empty-state message", () => {
    mockList();
    usePageStateMock.mockReturnValue({ kind: "denied", permission: "kb:pages:view" });

    render(<KbResearchBriefsPageContent basePath="/knowledge/research-briefs" />);

    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
    expect(screen.queryByText("Research brief form")).not.toBeInTheDocument();
    expect(screen.queryByText("No research briefs yet")).not.toBeInTheDocument();
    expect(usePageStateMock).toHaveBeenCalledWith(expect.objectContaining({ permission: "kb:pages:view", isEmpty: true }));
  });

  it("shows the form and empty message when access is granted and there are no briefs", () => {
    mockList();
    usePageStateMock.mockReturnValue({ kind: "empty" });

    render(<KbResearchBriefsPageContent basePath="/knowledge/research-briefs" />);

    expect(screen.getByText("Research brief form")).toBeInTheDocument();
    expect(screen.getByText("No research briefs yet")).toBeInTheDocument();
  });

  it("shows list skeleton while access or the first page loads", () => {
    mockList({ isLoading: true });
    usePageStateMock.mockReturnValue({ kind: "loading" });

    render(<KbResearchBriefsPageContent basePath="/knowledge/research-briefs" />);

    expect(screen.queryByText("Research brief form")).not.toBeInTheDocument();
    expect(screen.queryByText("No research briefs yet")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Research Briefs" })).toBeInTheDocument();
  });

  it("shows initial read error with a retry action", () => {
    const refetch = jest.fn();
    const error = new Error("First page failed");
    mockList({ isError: true, error, refetch });
    usePageStateMock.mockReturnValue({ kind: "error", error });

    render(<KbResearchBriefsPageContent basePath="/knowledge/research-briefs" />);

    expect(screen.getByText("First page failed")).toBeInTheDocument();
    expect(screen.queryByText("Research brief form")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps loaded briefs visible and retries the failed next page", () => {
    const fetchNextPage = jest.fn();
    mockList({
      data: { pages: [{ items: [{ id: 1, topic: "Existing research" }] }] },
      isError: true,
      isFetchNextPageError: true,
      error: new Error("Next page failed"),
      fetchNextPage,
      hasNextPage: true,
    });

    render(<KbResearchBriefsPageContent basePath="/knowledge/research-briefs" />);

    expect(screen.getByText("Existing research")).toBeInTheDocument();
    expect(screen.getByText("Couldn't load more research briefs")).toBeInTheDocument();
    expect(usePageStateMock).toHaveBeenCalledWith(expect.objectContaining({ isError: false }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});
