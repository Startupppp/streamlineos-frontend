import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { PageRecordLinks } from "./page-record-links";

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: jest.fn() }));
jest.mock("@/hooks/api/kb/record-links", () => ({
  useKbPageRecordLinks: jest.fn(),
  useAddKbPageRecordLink: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRemoveKbPageRecordLink: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));
jest.mock("./kb-record-target-combobox", () => ({
  KbRecordTargetCombobox: () => <div>Record search</div>,
}));
jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: ({ hasNextPage, onLoadMore }: { hasNextPage: boolean; onLoadMore: () => void }) =>
    hasNextPage ? <button type="button" onClick={onLoadMore}>Load more linked records</button> : null,
}));
jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    onRetry,
    children,
  }: {
    resolution: { kind: string };
    loading: ReactNode;
    empty: ReactNode;
    onRetry: () => void;
    children: ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "denied") return <p>No permission</p>;
    if (resolution.kind === "error") return <button type="button" onClick={onRetry}>Try again</button>;
    if (resolution.kind === "empty") return <>{empty}</>;
    return <>{children}</>;
  },
}));

const { useCan } = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access");
const { usePageState } = jest.requireMock<{ usePageState: jest.Mock }>("@/hooks/api/use-page-state");
const { useKbPageRecordLinks } = jest.requireMock<{ useKbPageRecordLinks: jest.Mock }>("@/hooks/api/kb/record-links");
const refetch = jest.fn();
const fetchNextPage = jest.fn();
const link = { id: 3, targetType: "project", targetId: "9", label: "Project Nine" };

function setReadState(overrides: Record<string, unknown> = {}) {
  useKbPageRecordLinks.mockReturnValue({
    data: [link],
    isLoading: false,
    isError: false,
    isFetchNextPageError: false,
    error: null,
    refetch,
    hasNextPage: false,
    fetchNextPage,
    isFetchingNextPage: false,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockReturnValue(true);
  usePageState.mockImplementation(({ isLoading, isError, isEmpty }: { isLoading: boolean; isError: boolean; isEmpty: boolean }) => ({
    kind: isLoading ? "loading" : isError ? "error" : isEmpty ? "empty" : "ready",
  }));
  setReadState();
});

it("shows first-read failure and retries without showing edit controls", () => {
  setReadState({ data: [], isError: true, error: new Error("offline") });
  render(<PageRecordLinks pageId={7} />);
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Link record" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("hides loaded rows and mutation controls after access is revoked", () => {
  usePageState.mockReturnValue({ kind: "denied" });
  setReadState({ isError: true, error: new ApiError("Denied", 403) });
  render(<PageRecordLinks pageId={7} />);
  expect(screen.getByText("No permission")).toBeInTheDocument();
  expect(screen.queryByText("Project Nine")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Link record" })).not.toBeInTheDocument();
  expect(usePageState).toHaveBeenCalledWith(expect.objectContaining({ permission: "kb:pages:view", isError: true }));
});

it("preserves loaded rows and retries a failed cursor page", () => {
  setReadState({ isError: true, isFetchNextPageError: true, error: new Error("offline"), hasNextPage: true });
  render(<PageRecordLinks pageId={7} />);
  expect(screen.getByText("Project Nine")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Could not load more linked records.");
  expect(screen.queryByRole("button", { name: "Load more linked records" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry loading linked records" }));
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
});
