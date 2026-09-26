/**
 * @jest-environment jsdom
 *
 * C6 (jsdom half) — token redaction: share tokens, form tokens and publication
 * tokens must never appear as visible text in the DOM when the corresponding
 * public surface renders. A token in a URL param drives data fetching; it must
 * not be echoed into headings, descriptions, breadcrumbs or any text node.
 *
 * Focus-order assertions for the public-form and intake surfaces are in the
 * companion Playwright spec (content-intake-a11y.spec.ts) because jsdom cannot
 * evaluate real focus order.
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

jest.mock("next/dynamic", () => () => () => null);
jest.mock("@excalidraw/excalidraw/index.css", () => ({}), { virtual: true });
jest.mock("./whiteboard-theme.css", () => ({}), { virtual: true });
jest.mock("./use-whiteboard-theme", () => ({
  useWhiteboardTheme: () => "light",
}));
jest.mock("./scene-utils", () => ({
  isExcalidrawScene: (data: unknown) => data != null,
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock("@/hooks/api/build", () => ({
  usePublicWhiteboard: jest.fn(),
  useUpdatePublicWhiteboard: jest.fn(),
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

beforeEach(() => {
  mockUseUpdatePublicWhiteboard.mockReturnValue(
    idleMutation as unknown as ReturnType<typeof useUpdatePublicWhiteboard>,
  );
});

const SHARE_TOKEN = "sh_T9bNxK3mLpW7vQ2rA6uC1dEfGhIjKl";

describe("PublicBoardView — share-token never appears in DOM text", () => {
  it("does not render the share token in any text node when the board is loading", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    const { container } = render(<PublicBoardView shareToken={SHARE_TOKEN} />);

    expect(container.textContent).not.toContain(SHARE_TOKEN);
  });

  it("does not render the share token in any text node when the board errors", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    const { container } = render(<PublicBoardView shareToken={SHARE_TOKEN} />);

    expect(container.textContent).not.toContain(SHARE_TOKEN);
  });

  it("does not render the share token in any text node when the board is ready", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: {
        name: "Sprint planning",
        data: {
          type: "excalidraw" as const,
          elements: [],
          appState: {},
          version: 2,
          source: "https://excalidraw.com",
        },
        access: "view" as const,
        allowExport: false,
        updatedAt: "2025-09-01T10:00:00Z",
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    const { container } = render(<PublicBoardView shareToken={SHARE_TOKEN} />);

    expect(container.textContent).not.toContain(SHARE_TOKEN);
    expect(screen.getByText("Sprint planning")).toBeInTheDocument();
  });

  it("does not render the share token in any text node for an editable board", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: {
        name: "Architecture diagram",
        data: {
          type: "excalidraw" as const,
          elements: [],
          appState: {},
          version: 2,
          source: "https://excalidraw.com",
        },
        access: "edit" as const,
        allowExport: true,
        updatedAt: "2025-09-01T10:00:00Z",
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    const { container } = render(<PublicBoardView shareToken={SHARE_TOKEN} />);

    expect(container.textContent).not.toContain(SHARE_TOKEN);
    expect(screen.getByText("Architecture diagram")).toBeInTheDocument();
  });
});

describe("PublicBoardView — token is not echoed into accessible names", () => {
  it("no aria-label or title attribute contains the raw share token", () => {
    mockUsePublicWhiteboard.mockReturnValue({
      data: {
        name: "Sprint planning",
        data: {
          type: "excalidraw" as const,
          elements: [],
          appState: {},
          version: 2,
          source: "https://excalidraw.com",
        },
        access: "view" as const,
        allowExport: false,
        updatedAt: null,
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePublicWhiteboard>);

    const { container } = render(<PublicBoardView shareToken={SHARE_TOKEN} />);

    const allElements = container.querySelectorAll("[aria-label], [title]");
    for (const el of allElements) {
      expect(el.getAttribute("aria-label") ?? "").not.toContain(SHARE_TOKEN);
      expect(el.getAttribute("title") ?? "").not.toContain(SHARE_TOKEN);
    }
  });
});
