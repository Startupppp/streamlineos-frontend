import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ACCESS_DENIED,
  ReleaseMobileCard,
  baseQueryResult,
  buildReleasesColumns,
  cursorPage,
  installReleasesMocks,
  mockPreventDefault,
  mockUseAccess,
  mockUseCan,
  mockUseReleases,
  OWNER,
  OWNER_USER_ID,
  releaseColumnCell,
  releaseRow,
  releaseState,
} from "./releases-page-test-harness";
import { ReleasesPage } from "./releases-page";

beforeEach(installReleasesMocks);

it("renders NoPermissionState when build:view is denied instead of empty releases table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseReleases.mockReturnValue(baseQueryResult());
  render(<ReleasesPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
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
  expect(screen.queryByRole("button", { name: /new release/i })).not.toBeInTheDocument();
});

it("shows New Release button when build:manage is granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<ReleasesPage projectId={1} />);
  expect(screen.getByRole("button", { name: /new release/i })).toBeInTheDocument();
});

it("keyboard c shortcut opens the release form sheet", () => {
  mockUseCan.mockReturnValue(true);
  render(<ReleasesPage projectId={1} />);
  fireEvent.keyDown(document, { key: "c" });
  expect(screen.getByTestId("release-form-sheet")).toBeInTheDocument();
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
