import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

jest.mock("next/dynamic", () => () => () => null);
jest.mock("@excalidraw/excalidraw/index.css", () => ({}), { virtual: true });
jest.mock("./whiteboard-theme.css", () => ({}), { virtual: true });

jest.mock("@/hooks/api/build", () => ({
  usePublicWhiteboard: jest.fn(),
  useUpdatePublicWhiteboard: jest.fn(),
}));

jest.mock("./use-whiteboard-theme", () => ({
  useWhiteboardTheme: () => "light",
}));

jest.mock("./scene-utils", () => ({
  isExcalidrawScene: (data: unknown) => data != null,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { usePublicWhiteboard, useUpdatePublicWhiteboard } from "@/hooks/api/build";
import { PublicBoardView } from "./public-board-view";

const mockUsePublicWhiteboard = usePublicWhiteboard as jest.MockedFunction<typeof usePublicWhiteboard>;
const mockUseUpdatePublicWhiteboard = useUpdatePublicWhiteboard as jest.MockedFunction<typeof useUpdatePublicWhiteboard>;

const idleMutation = {
  mutate: jest.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
};

const viewBoard = {
  name: "Sprint planning",
  data: { type: "excalidraw" as const, elements: [], appState: {}, version: 2, source: "https://excalidraw.com" },
  access: "view" as const,
  allowExport: false,
  updatedAt: "2025-09-01T10:00:00Z",
};

const editBoard = {
  ...viewBoard,
  name: "Architecture diagram",
  access: "edit" as const,
  allowExport: true,
};

beforeEach(() => {
  mockUseUpdatePublicWhiteboard.mockReturnValue(
    idleMutation as unknown as ReturnType<typeof useUpdatePublicWhiteboard>,
  );
});

describe("PublicBoardView — loading state", () => {
  it("renders loading skeletons while the board is being fetched", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    render(<PublicBoardView shareToken="tok_abc123" />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("PublicBoardView — error / invalid-token state", () => {
  it("shows an invalid-link message when the fetch errors", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    render(<PublicBoardView shareToken="tok_expired" />);

    expect(
      screen.getByText("This board link is invalid or has expired"),
    ).toBeInTheDocument();
  });

  it("shows a recovery link back to StreamlineOS when the token is invalid", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    render(<PublicBoardView shareToken="tok_expired" />);

    expect(screen.getByRole("link", { name: /go to streamlineos/i })).toBeInTheDocument();
  });

  it("shows the invalid-link state when query succeeds but data is missing", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    render(<PublicBoardView shareToken="tok_absent" />);

    expect(
      screen.getByText("This board link is invalid or has expired"),
    ).toBeInTheDocument();
  });
});

describe("PublicBoardView — ready state, view-only access", () => {
  it("renders the board name in the header", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: viewBoard,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    render(<PublicBoardView shareToken="tok_view" />);

    expect(screen.getByText("Sprint planning")).toBeInTheDocument();
  });

  it("shows a 'View only' badge for view-access boards", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: viewBoard,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    render(<PublicBoardView shareToken="tok_view" />);

    expect(screen.getByText("View only")).toBeInTheDocument();
  });
});

describe("PublicBoardView — ready state, edit access", () => {
  it("renders the board name for an editable board", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: editBoard,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    render(<PublicBoardView shareToken="tok_edit" />);

    expect(screen.getByText("Architecture diagram")).toBeInTheDocument();
  });

  it("shows 'Saved' save status for an editable board on initial render", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: editBoard,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    render(<PublicBoardView shareToken="tok_edit" />);

    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("does not show 'View only' badge for an editable board", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: editBoard,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    render(<PublicBoardView shareToken="tok_edit" />);

    expect(screen.queryByText("View only")).not.toBeInTheDocument();
  });
});
