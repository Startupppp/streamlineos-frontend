import { renderHook } from "@testing-library/react";

const mockSetPaletteOpen = jest.fn();
const mockOpenCreateTicket = jest.fn();
const mockPush = jest.fn();
const mockPathname = { current: "/build/1/backlog" };

jest.mock("./use-command-palette", () => ({
  useCommandPalette: () => ({
    setPaletteOpen: mockSetPaletteOpen,
    setHelpOpen: jest.fn(),
    openCreateTicket: mockOpenCreateTicket,
  }),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname.current,
  useRouter: () => ({ push: mockPush }),
}));

import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

function press(key: string) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.current = "/build/1/backlog";
});

describe("extractProjectId — regex fix", () => {
  it("recognises a numeric segment after /build/ and fires c shortcut", () => {
    mockPathname.current = "/build/42/backlog";
    renderHook(() => useKeyboardShortcuts());
    press("c");
    expect(mockOpenCreateTicket).toHaveBeenCalledWith(42);
  });

  it("does not fire c shortcut on /projects/ paths (legacy pattern removed)", () => {
    mockPathname.current = "/projects/42";
    renderHook(() => useKeyboardShortcuts());
    press("c");
    expect(mockOpenCreateTicket).not.toHaveBeenCalled();
  });

  it("fires c shortcut on /build/my-work (org-level route) with null projectId so the create dialog can prompt for project", () => {
    mockPathname.current = "/build/my-work";
    renderHook(() => useKeyboardShortcuts());
    press("c");
    expect(mockOpenCreateTicket).toHaveBeenCalledWith(null);
  });

  it("fires c shortcut on /build (projects list) with null projectId", () => {
    mockPathname.current = "/build";
    renderHook(() => useKeyboardShortcuts());
    press("c");
    expect(mockOpenCreateTicket).toHaveBeenCalledWith(null);
  });

  it("does not fire c shortcut on /build/command-center because its own chord handler owns c", () => {
    mockPathname.current = "/build/command-center";
    renderHook(() => useKeyboardShortcuts());
    press("c");
    expect(mockOpenCreateTicket).not.toHaveBeenCalled();
  });

  it("fires g+b chord and navigates to /build/<id>", () => {
    mockPathname.current = "/build/7/backlog";
    renderHook(() => useKeyboardShortcuts());
    press("g");
    press("b");
    expect(mockPush).toHaveBeenCalledWith("/build/7");
  });

  it("fires g+i chord and navigates to /build/<id>/my-tickets", () => {
    mockPathname.current = "/build/7/backlog";
    renderHook(() => useKeyboardShortcuts());
    press("g");
    press("i");
    expect(mockPush).toHaveBeenCalledWith("/build/7/my-tickets");
  });
});

describe("/ shortcut — global palette handler", () => {
  it("opens the palette when / is pressed", () => {
    renderHook(() => useKeyboardShortcuts());
    press("/");
    expect(mockSetPaletteOpen).toHaveBeenCalledWith(true);
  });

  it("does not open the palette when / is pressed inside an input element", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useKeyboardShortcuts());
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }),
    );
    expect(mockSetPaletteOpen).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
