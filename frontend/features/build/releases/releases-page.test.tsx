import React from "react";
import { render, renderHook, act, screen, fireEvent, within } from "@testing-library/react";
import {
  ACCESS_DENIED,
  baseQueryResult,
  cursorPage,
  installReleasesMocks,
  installReleasesNavigationMocks,
  mockReplace,
  mockPreventDefault,
  mockUseAccess,
  mockUseCan,
  mockUseReleases,
  releaseColumnCell,
  releaseRow,
  releaseState,
} from "./releases-page-test-harness";
import { ReleasesPage } from "./releases-page";
import { useReleasesPage } from "./use-releases-page";

beforeEach(installReleasesMocks);

it.each([
  { search: "", range: { from: "2026-10-01", to: "2026-10-06" } },
  { search: "&from=2026-10-01&to=2026-10-06", range: { from: "", to: "" } },
])("acknowledges one complete date range write for $range", ({ search, range }) => {
  installReleasesNavigationMocks(`tab=releases&q=release&status=draft${search}`);
  const { result, rerender } = renderHook(() => useReleasesPage(1));
  expect(mockUseReleases).toHaveBeenLastCalledWith(1, expect.objectContaining({
    from: search ? "2026-10-01" : undefined, to: search ? "2026-10-06" : undefined,
  }));
  expect(mockReplace).not.toHaveBeenCalled();
  act(() => result.current.handleDateRangeChange(range));
  const writtenUrl = mockReplace.mock.lastCall?.[0];
  if (typeof writtenUrl !== "string") throw new Error("The date range did not write a URL");
  const params = new URL(writtenUrl, "https://streamline.test").searchParams;
  expect(params.get("from")).toBe(range.from || null);
  expect(params.get("to")).toBe(range.to || null);
  expect(params.get("status")).toBe("draft");
  expect(params.get("q")).toBe("release");
  expect(params.get("tab")).toBe("releases");
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith(writtenUrl, { scroll: false });
  installReleasesNavigationMocks(params.toString());
  rerender();
  expect(mockUseReleases).toHaveBeenLastCalledWith(1, expect.objectContaining({
    q: "release", status: "draft", from: range.from || undefined, to: range.to || undefined,
  }));
  expect(result.current.sheetOpen).toBe(false);
  expect(result.current.deleteRelease.mutate).not.toHaveBeenCalled();
});

it("renders NoPermissionState when build:view is denied instead of empty releases table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseReleases.mockReturnValue(baseQueryResult());
  render(<ReleasesPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("shows actual query error message on failure instead of hardcoded text", () => {
  mockUseReleases.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Build module is not enabled for this project") }),
  );
  render(<ReleasesPage projectId={1} />);
  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Build module is not enabled");
});

it("omits the all sentinel from the API date filters", () => {
  render(<ReleasesPage projectId={1} />);

  expect(mockUseReleases.mock.calls[0]?.[1]).toEqual(
    expect.objectContaining({ from: undefined, to: undefined }),
  );
});

it("hides New Release button when build:manage is denied", () => {
  mockUseCan.mockReturnValue(false);
  render(<ReleasesPage projectId={1} />);
  expect(screen.getByRole("heading", { name: "No releases yet" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /new release/i })).not.toBeInTheDocument();
});

it("shows New Release button when build:manage is granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<ReleasesPage projectId={1} />);
  expect(within(screen.getByTestId("page-actions")).getByRole("button", { name: /new release/i })).toBeInTheDocument();
  const body = within(screen.getByRole("status"));
  expect(body.getByRole("heading", { name: "No releases yet" })).toBeInTheDocument();
  expect(body.getByRole("button", { name: /new release/i })).toBeInTheDocument();
  fireEvent.click(body.getByRole("button", { name: /new release/i }));
  expect(screen.getByTestId("release-form-sheet")).toBeInTheDocument();
});

it("keyboard c shortcut opens the release form sheet", () => {
  mockUseCan.mockReturnValue(true);
  render(<ReleasesPage projectId={1} />);
  fireEvent.keyDown(document, { key: "c" });
  expect(screen.getByTestId("release-form-sheet")).toBeInTheDocument();
});

it("denied keyboard c shortcut does not open the release form sheet", () => {
  mockUseCan.mockReturnValue(false);
  render(<ReleasesPage projectId={1} />);
  fireEvent.keyDown(document, { key: "c" });
  expect(screen.queryByTestId("release-form-sheet")).not.toBeInTheDocument();
});

it.each([true, false])("genuine empty has no Clear filters when canManage is %s", (canManage) => {
  mockUseCan.mockReturnValue(canManage);
  render(<ReleasesPage projectId={1} />);
  expect(screen.getByRole("heading", { name: "No releases yet" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
});

it.each([true, false])("filtered body clears supported URL filters when canManage is %s", (canManage) => {
  mockUseCan.mockReturnValue(canManage);
  installReleasesNavigationMocks("tab=releases&q=missing&status=draft&from=2026-10-01&to=2026-10-06&cursor=older&page=2&cursors=%5B%22older%22%5D");
  const view = render(<ReleasesPage projectId={1} />);
  const body = within(screen.getByRole("status"));
  expect(body.getByRole("heading", { name: "No releases match your filters" })).toBeInTheDocument();
  expect(body.queryByRole("button", { name: /new release/i })).not.toBeInTheDocument();
  expect(mockUseReleases).toHaveBeenLastCalledWith(1, expect.objectContaining({
    cursor: "older", q: "missing", status: "draft", from: "2026-10-01", to: "2026-10-06",
  }));
  fireEvent.click(body.getByRole("button", { name: "Clear filters" }));
  expect(mockReplace).toHaveBeenLastCalledWith("/build?tab=releases&cursors=%5B%22older%22%5D", { scroll: false });
  const clearUrl = mockReplace.mock.lastCall?.[0];
  if (typeof clearUrl !== "string") throw new Error("Clear filters did not write a URL");
  installReleasesNavigationMocks(new URL(clearUrl, "https://streamline.test").search);
  view.rerender(<ReleasesPage projectId={1} />);
  expect(mockReplace).toHaveBeenLastCalledWith("/build?tab=releases", { scroll: false });
  const resetUrl = mockReplace.mock.lastCall?.[0];
  if (typeof resetUrl !== "string") throw new Error("The pager did not reset its cursor stack");
  installReleasesNavigationMocks(new URL(resetUrl, "https://streamline.test").search);
  view.rerender(<ReleasesPage projectId={1} />);
  expect(screen.getByRole("heading", { name: "No releases yet" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  expect(mockUseReleases).toHaveBeenLastCalledWith(1, expect.objectContaining({
    cursor: undefined, q: undefined, status: undefined, from: undefined, to: undefined,
  }));
});

it.each([true, false])("populated releases have no empty status when canManage is %s", (canManage) => {
  mockUseCan.mockReturnValue(canManage);
  mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([releaseRow]) }));
  render(<ReleasesPage projectId={1} />);
  expect(screen.getByTestId("table-rows")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("shows the offline notice when the user loses connectivity", () => {
  releaseState.isOnline = false;
  render(<ReleasesPage projectId={1} />);
  expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
});

it("hides the offline notice when the user is online", () => {
  releaseState.isOnline = true;
  render(<ReleasesPage projectId={1} />);
  expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
});

describe("right click on a release row opens the row's authorized actions", () => {
  function renderWithRows() {
    mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([releaseRow]) }));
    render(<ReleasesPage projectId={1} />);
  }

  it("opens Edit and Delete for a viewer who can manage releases, and suppresses the browser menu", () => {
    renderWithRows();
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("row-contextmenu-1"));
    expect(mockPreventDefault).toHaveBeenCalled();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("opens nothing and leaves the browser menu alone for a viewer who cannot manage releases", () => {
    mockUseCan.mockReturnValue(false);
    renderWithRows();
    fireEvent.click(screen.getByTestId("row-contextmenu-1"));
    expect(mockPreventDefault).not.toHaveBeenCalled();
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("opens the edit sheet for the row the menu was opened on", () => {
    renderWithRows();
    fireEvent.click(screen.getByTestId("row-contextmenu-1"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByTestId("release-form-sheet")).toBeInTheDocument();
  });

  it("opens the destructive confirmation naming the row, rather than deleting it outright", () => {
    renderWithRows();
    fireEvent.click(screen.getByTestId("row-contextmenu-1"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(screen.getByTestId("confirm-delete")).toHaveTextContent("v1.0.0");
  });
});

describe("readiness column renders the readiness status badge from release data", () => {
  it("shows the Ready badge when readiness is ready", () => {
    const handlers = { canManage: true, onEdit: jest.fn(), onDelete: jest.fn() };
    const cell = releaseColumnCell("readiness", handlers);
    const row = { ...releaseRow, readiness: "ready" } as unknown as typeof releaseRow;
    const { container } = render(cell(row as Parameters<typeof cell>[0]) as React.ReactElement);
    expect(container.textContent).toContain("Ready");
  });

  it("shows a dash when readiness is absent from the row", () => {
    const handlers = { canManage: true, onEdit: jest.fn(), onDelete: jest.fn() };
    const cell = releaseColumnCell("readiness", handlers);
    const { container } = render(cell(releaseRow as Parameters<typeof cell>[0]) as React.ReactElement);
    expect(container.textContent).toContain("—");
  });
});

describe("a release is never selected as a row, because it is this page's primary record", () => {
  it("passes no selection to the table, so no checkbox column and no bulk status strip exist", () => {
    mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([releaseRow]) }));
    render(<ReleasesPage projectId={1} />);
    expect(releaseState.dataTableProps.selection).toBeUndefined();
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Set status…")).not.toBeInTheDocument();
  });

  it("still reaches one release's status through its own edit sheet, so removing the strip removed no capability", () => {
    mockUseReleases.mockReturnValue(baseQueryResult({ data: cursorPage([releaseRow]) }));
    render(<ReleasesPage projectId={1} />);
    expect(screen.queryByTestId("release-form-sheet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("row-contextmenu-1"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByTestId("release-form-sheet")).toBeInTheDocument();
  });
});
