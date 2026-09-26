import { render, screen, fireEvent } from "@testing-library/react";
import { KbResearchBriefDetail } from "./kb-research-brief-detail";
import {
  useKbResearchBrief,
  useConvertResearchBriefToPage,
} from "@/hooks/api/kb/research-briefs";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn() }),
  usePathname: () => "/knowledge/research-briefs/1",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/kb/research-briefs", () => ({
  useKbResearchBrief: jest.fn(),
  useRateResearchBrief: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRetryResearchBrief: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useCancelResearchBrief: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useConvertResearchBriefToPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useApproveResearchBrief: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpace: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/components/ai/ai-citation-chips", () => ({
  AiCitationChips: () => <div data-testid="citation-chips" />,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const useKbResearchBriefMock = jest.mocked(useKbResearchBrief);
const useConvertResearchBriefToPageMock = jest.mocked(useConvertResearchBriefToPage);

function brief(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    orgId: "org-1",
    userId: "user-1",
    topic: "How do we onboard a new reseller?",
    spaceId: null,
    status: "completed",
    jobId: 9,
    sourceCount: 4,
    report: "A reseller is onboarded in four steps.",
    citations: [],
    errorMessage: null,
    rating: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:05:00.000Z",
    ...overrides,
  };
}

function mockBrief(overrides: Record<string, unknown> = {}) {
  useKbResearchBriefMock.mockReturnValue({
    data: brief(overrides),
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useKbResearchBrief>);
}

const { useKbSpace } = jest.requireMock("@/hooks/api/kb/spaces") as {
  useKbSpace: jest.Mock;
};

describe("KbResearchBriefDetail — convert to page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKbSpace.mockReturnValue({ data: undefined });
  });

  it("offers a convert-to-page action for a completed brief, so the backend convert route has a caller", () => {
    mockBrief();

    render(<KbResearchBriefDetail briefId={1} basePath="/knowledge/research-briefs" />);

    expect(
      screen.getByRole("button", { name: /convert to page/i }),
    ).toBeInTheDocument();
  });

  it("converts through the research brief hook and routes to the created page", () => {
    const mutate = jest.fn(
      (
        _briefId: number,
        options?: { onSuccess?: (result: { pageId: number }) => void },
      ) => {
        options?.onSuccess?.({ pageId: 77 });
      },
    );
    useConvertResearchBriefToPageMock.mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useConvertResearchBriefToPage>);
    mockBrief();

    render(<KbResearchBriefDetail briefId={1} basePath="/knowledge/research-briefs" />);
    fireEvent.click(screen.getByRole("button", { name: /convert to page/i }));

    expect(mutate).toHaveBeenCalled();
    expect(mutate.mock.calls[0]?.[0]).toBe(1);
    expect(pushMock).toHaveBeenCalledWith("/knowledge/wiki/doc/77");
  });

  it("offers no convert-to-page action while the brief is still running, because there is no report to convert", () => {
    mockBrief({ status: "running", report: null });

    render(<KbResearchBriefDetail briefId={1} basePath="/knowledge/research-briefs" />);

    expect(
      screen.queryByRole("button", { name: /convert to page/i }),
    ).not.toBeInTheDocument();
  });
});

describe("KbResearchBriefDetail — S19 scope and owner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKbSpace.mockReturnValue({ data: undefined });
  });

  it("always renders an Owner row showing 'You', because a brief is always created by the calling user", () => {
    mockBrief();

    render(<KbResearchBriefDetail briefId={1} basePath="/knowledge/research-briefs" />);

    expect(screen.getByText(/Owner:/i)).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("renders the space name as the Scope when spaceId is set and the space resolves", () => {
    useKbSpace.mockReturnValue({ data: { id: 3, name: "Engineering Hub" } });
    mockBrief({ spaceId: 3 });

    render(<KbResearchBriefDetail briefId={1} basePath="/knowledge/research-briefs" />);

    expect(screen.getByText(/Scope:/i)).toBeInTheDocument();
    expect(screen.getByText("Engineering Hub")).toBeInTheDocument();
  });

  it("falls back to 'Space N' while the space name is loading, so the label is never empty", () => {
    useKbSpace.mockReturnValue({ data: undefined });
    mockBrief({ spaceId: 3 });

    render(<KbResearchBriefDetail briefId={1} basePath="/knowledge/research-briefs" />);

    expect(screen.getByText(/Scope:/i)).toBeInTheDocument();
    expect(screen.getByText("Space 3")).toBeInTheDocument();
  });

  it("omits the Scope row entirely when spaceId is null, so a global brief does not show a misleading label (CONTROL: scope renders when spaceId is set)", () => {
    useKbSpace.mockReturnValue({ data: { id: 3, name: "Engineering Hub" } });

    mockBrief({ spaceId: null });
    render(<KbResearchBriefDetail briefId={1} basePath="/knowledge/research-briefs" />);
    expect(screen.queryByText(/Scope:/i)).not.toBeInTheDocument();

    mockBrief({ spaceId: 3 });
    render(<KbResearchBriefDetail briefId={1} basePath="/knowledge/research-briefs" />);
    expect(screen.getAllByText(/Scope:/i).length).toBeGreaterThan(0);
  });
});
