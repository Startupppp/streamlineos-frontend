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
import {
  claimBuildListSearchTarget,
} from "@/lib/build/build-list-search-target";

function press(key: string) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.current = "/build/1/backlog";
  claimBuildListSearchTarget({ current: null })();
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

  it("fires g+i chord and navigates to the canonical /build/my-work scoped to the project", () => {
    mockPathname.current = "/build/7/backlog";
    renderHook(() => useKeyboardShortcuts());
    press("g");
    press("i");
    expect(mockPush).toHaveBeenCalledWith("/build/my-work?projectId=7");
  });
});

describe("c shortcut — contenteditable guard (BUG-035)", () => {
  it("does not fire c shortcut when event.target is directly contenteditable", () => {
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    document.body.appendChild(editor);
    renderHook(() => useKeyboardShortcuts());
    editor.dispatchEvent(
      new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true }),
    );
    expect(mockOpenCreateTicket).not.toHaveBeenCalled();
    document.body.removeChild(editor);
  });

  it("does not fire c shortcut when event.target is an atomic node with contenteditable=false inside a contenteditable=true editor", () => {
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    const atomicNode = document.createElement("span");
    atomicNode.setAttribute("contenteditable", "false");
    editor.appendChild(atomicNode);
    document.body.appendChild(editor);
    renderHook(() => useKeyboardShortcuts());
    atomicNode.dispatchEvent(
      new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true }),
    );
    expect(mockOpenCreateTicket).not.toHaveBeenCalled();
    document.body.removeChild(editor);
  });

  it("still fires c shortcut when event.target is outside any contenteditable tree", () => {
    mockPathname.current = "/build/1/backlog";
    renderHook(() => useKeyboardShortcuts());
    press("c");
    expect(mockOpenCreateTicket).toHaveBeenCalledWith(1);
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

  it("focuses the build-list search input and does not open the palette when a search target is claimed", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const release = claimBuildListSearchTarget({ current: input });
    renderHook(() => useKeyboardShortcuts());

    press("/");

    expect(mockSetPaletteOpen).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    release();
    input.remove();
  });

  it("opens the palette when / is pressed after the build-list search target is released", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const release = claimBuildListSearchTarget({ current: input });
    release();
    renderHook(() => useKeyboardShortcuts());

    press("/");

    expect(mockSetPaletteOpen).toHaveBeenCalledWith(true);
    input.remove();
  });
});

describe("c shortcut — input/textarea guard", () => {
  it("does not fire c shortcut when focus is in an input", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useKeyboardShortcuts());
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true }),
    );
    expect(mockOpenCreateTicket).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("does not fire c shortcut when focus is in a textarea", () => {
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    renderHook(() => useKeyboardShortcuts());
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true }),
    );
    expect(mockOpenCreateTicket).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it("does not open the palette with / when document.activeElement is an input even if event target is document", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useKeyboardShortcuts());
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }),
    );
    expect(mockSetPaletteOpen).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
