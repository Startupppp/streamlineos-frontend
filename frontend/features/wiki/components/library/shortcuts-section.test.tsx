import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortcutsSection } from "./shortcuts-section";

jest.mock("@/hooks/api/kb/shortcuts", () => ({
  useKbShortcuts: jest.fn(),
  useDeleteKbShortcut: jest.fn(),
}));

import { useDeleteKbShortcut, useKbShortcuts } from "@/hooks/api/kb/shortcuts";

const mockUseKbShortcuts = useKbShortcuts as jest.Mock;
const mutate = jest.fn();

function shortcut(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    targetPageId: 12,
    createdAt: "2026-10-21T00:00:00.000Z",
    state: "available",
    target: { id: 12, title: "Budget", icon: null, kind: "spreadsheet", spaceId: 3, status: "published" },
    ...overrides,
  };
}

beforeEach(() => {
  mutate.mockReset();
  (useDeleteKbShortcut as jest.Mock).mockReturnValue({ mutate, isPending: false });
});

describe("ShortcutsSection", () => {
  it("renders nothing when the member has no shortcuts", () => {
    mockUseKbShortcuts.mockReturnValue({ data: [], isLoading: false, isError: false });
    const { container } = render(<ShortcutsSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links an available shortcut to its target file", () => {
    mockUseKbShortcuts.mockReturnValue({ data: [shortcut()], isLoading: false, isError: false });
    render(<ShortcutsSection />);
    expect(screen.getByRole("link", { name: "Budget" })).toHaveAttribute("href", expect.stringContaining("12"));
  });

  it("shows an unavailable shortcut without a link and without revealing the hidden title", () => {
    mockUseKbShortcuts.mockReturnValue({ data: [shortcut({ state: "unavailable", target: null })], isLoading: false, isError: false });
    render(<ShortcutsSection />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Unavailable page")).toBeInTheDocument();
  });

  it("removes the shortcut, not the target, when Remove is pressed", async () => {
    mockUseKbShortcuts.mockReturnValue({ data: [shortcut()], isLoading: false, isError: false });
    render(<ShortcutsSection />);
    await userEvent.click(screen.getByRole("button", { name: "Remove shortcut" }));
    expect(mutate).toHaveBeenCalledWith(5, expect.any(Object));
  });

  it("shows a load error inline", () => {
    mockUseKbShortcuts.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<ShortcutsSection />);
    expect(screen.getByText("Could not load shortcuts.")).toBeInTheDocument();
  });
});
