import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { resolvePageState } from "@/lib/page-state/resolve-page-state";
import type { UsePageStateOptions } from "@/hooks/api/use-page-state";
import type {
  KnowledgeGap,
  ListKnowledgeGapsResponse,
} from "@/features/support/lib/knowledge-gap.types";
import { KnowledgeGapsPage } from "./knowledge-gaps-page";

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
    actions,
  }: {
    children: React.ReactNode;
    title?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

const usePageStateSpy = jest.fn();
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (options: UsePageStateOptions) => {
    usePageStateSpy(options);
    const { permission, isLoading, isError, error, isEmpty } = options;
    return resolvePageState({
      permission,
      access: "granted",
      isLoading,
      isError,
      error,
      isEmpty,
    });
  },
}));

const useKnowledgeGaps = jest.fn();
const fetchNextPage = jest.fn();
jest.mock("@/hooks/api/support/knowledge-gaps", () => ({
  useKnowledgeGaps: () => useKnowledgeGaps(),
  useDetectGaps: () => ({ isPending: false, mutate: jest.fn() }),
  useDraftGap: () => ({ isPending: false, mutate: jest.fn(), variables: undefined }),
  useDismissGap: () => ({ isPending: false, mutate: jest.fn(), variables: undefined }),
}));

const { useCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };

function makeGap(id: number, question: string): KnowledgeGap {
  return {
    id,
    orgId: "org-1",
    representativeQuestion: question,
    ticketCount: 3,
    sampleTicketIds: [id],
    status: "OPEN",
    proposedArticleId: null,
    dismissalReason: null,
    draftedBy: null,
    reviewedBy: null,
    evidence: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    deflectionCount: 0,
    proposedArticleTitle: null,
  };
}

function settled(
  pages: ListKnowledgeGapsResponse[],
  overrides: Record<string, unknown> = {},
) {
  return {
    data: { pages, pageParams: [undefined] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage,
    hasNextPage: pages.at(-1)?.nextCursor !== null,
    isFetchingNextPage: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
});

describe("KnowledgeGapsPage — paging through the gap list", () => {
  it("renders the gaps from every loaded page, because a cursor swap used to replace page one rather than extend it", () => {
    useKnowledgeGaps.mockReturnValue(
      settled([
        { gaps: [makeGap(1, "How do I get a refund?")], nextCursor: 1 },
        { gaps: [makeGap(2, "Where is my invoice?")], nextCursor: null },
      ]),
    );

    render(<KnowledgeGapsPage />);

    expect(screen.getByText("How do I get a refund?")).toBeInTheDocument();
    expect(screen.getByText("Where is my invoice?")).toBeInTheDocument();
  });

  it("renders only the first page's gaps when only the first page is loaded, so the assertion above is about accumulation and not about the list always showing everything", () => {
    useKnowledgeGaps.mockReturnValue(
      settled([{ gaps: [makeGap(1, "How do I get a refund?")], nextCursor: 1 }]),
    );

    render(<KnowledgeGapsPage />);

    expect(screen.getByText("How do I get a refund?")).toBeInTheDocument();
    expect(screen.queryByText("Where is my invoice?")).not.toBeInTheDocument();
  });

  it("asks the query for the next page instead of re-keying the read, so the rows already on screen survive the fetch", () => {
    useKnowledgeGaps.mockReturnValue(
      settled([{ gaps: [makeGap(1, "How do I get a refund?")], nextCursor: 1 }]),
    );

    render(<KnowledgeGapsPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Load more knowledge gaps" }),
    );

    expect(fetchNextPage).toHaveBeenCalled();
    expect(screen.getByText("How do I get a refund?")).toBeInTheDocument();
  });

  it("offers no next-page control once the last page reports no cursor", () => {
    useKnowledgeGaps.mockReturnValue(
      settled([{ gaps: [makeGap(1, "How do I get a refund?")], nextCursor: null }]),
    );

    render(<KnowledgeGapsPage />);

    expect(
      screen.queryByRole("button", { name: "Load more knowledge gaps" }),
    ).not.toBeInTheDocument();
  });
});

describe("KnowledgeGapsPage — page state", () => {
  it("passes the read error to usePageState, because omitting it turns a 402 into Something went wrong", () => {
    const error = new Error("upstream failed");
    useKnowledgeGaps.mockReturnValue(
      settled([], { isError: true, error, data: undefined }),
    );

    render(<KnowledgeGapsPage />);

    expect(usePageStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true, error }),
    );
  });

  it("resolves the error branch instead of rendering an empty list, which is what a boolean ladder produced for a denial", () => {
    useKnowledgeGaps.mockReturnValue(
      settled([], {
        isError: true,
        error: new Error("upstream failed"),
        data: undefined,
      }),
    );

    render(<KnowledgeGapsPage />);

    expect(
      screen.queryByText("No knowledge gaps detected yet"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows the empty state when the loaded pages hold no gaps at all", () => {
    useKnowledgeGaps.mockReturnValue(settled([{ gaps: [], nextCursor: null }]));

    render(<KnowledgeGapsPage />);

    expect(
      screen.getByText("No knowledge gaps detected yet"),
    ).toBeInTheDocument();
  });

  it("offers no detect control from the empty state to a caller without the manage permission, and the control above proves the assertion can fail", () => {
    useCan.mockReturnValue(false);
    useKnowledgeGaps.mockReturnValue(settled([{ gaps: [], nextCursor: null }]));

    render(<KnowledgeGapsPage />);

    expect(
      screen.queryByRole("button", { name: "Detect Gaps" }),
    ).not.toBeInTheDocument();
  });
});
