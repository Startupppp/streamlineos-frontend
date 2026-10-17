import { fireEvent, render, screen } from "@testing-library/react";
import { SpaceArchiveImpact } from "./space-archive-impact";

jest.mock("@/hooks/api/kb/spaces", () => ({ useKbSpaceArchiveImpact: jest.fn() }));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: jest.fn() }));

const { useKbSpaceArchiveImpact } = jest.requireMock<{ useKbSpaceArchiveImpact: jest.Mock }>("@/hooks/api/kb/spaces");
const { usePageState } = jest.requireMock<{ usePageState: jest.Mock }>("@/hooks/api/use-page-state");
const refetch = jest.fn();

function setImpact(overrides: Record<string, unknown> = {}) {
  useKbSpaceArchiveImpact.mockReturnValue({
    data: { pageCount: 2, publicLinkCount: 1, recordLinkCount: 3, askIndexed: true },
    isLoading: false,
    isError: false,
    error: null,
    refetch,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  usePageState.mockImplementation(({ isLoading, isError, isEmpty, error }: { isLoading: boolean; isError: boolean; isEmpty: boolean; error: unknown }) => ({
    kind: isLoading ? "loading" : isError ? "error" : isEmpty ? "empty" : "ready",
    error,
  }));
  setImpact();
});

it("shows the full archive impact when the read succeeds", () => {
  render(<SpaceArchiveImpact spaceId={10} />);
  expect(screen.getByText("This affects 2 pages · 1 public link · 3 record links · indexed for Ask.")).toBeInTheDocument();
  expect(usePageState).toHaveBeenCalledWith(expect.objectContaining({ permission: "kb:spaces:manage" }));
});

it("does not present counts while the impact read is pending", () => {
  setImpact({ data: undefined, isLoading: true });
  render(<SpaceArchiveImpact spaceId={10} />);
  expect(screen.queryByText(/This affects/)).not.toBeInTheDocument();
});

it("shows a retryable error instead of silently hiding a failed impact read", () => {
  setImpact({ data: undefined, isError: true, error: new Error("offline") });
  render(<SpaceArchiveImpact spaceId={10} />);
  expect(screen.getByText("offline")).toBeInTheDocument();
  expect(screen.queryByText(/This affects/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("hides cached counts if access to impact is denied", () => {
  usePageState.mockReturnValue({ kind: "denied" });
  render(<SpaceArchiveImpact spaceId={10} />);
  expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  expect(screen.queryByText(/This affects/)).not.toBeInTheDocument();
});

it("offers a retry when no impact data is returned", () => {
  setImpact({ data: undefined });
  render(<SpaceArchiveImpact spaceId={10} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Archive impact is unavailable.");
  fireEvent.click(screen.getByRole("button", { name: "Retry archive impact" }));
  expect(refetch).toHaveBeenCalledTimes(1);
});
