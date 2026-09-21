import { renderHook } from "@testing-library/react";

const mockPush = jest.fn();
const mockRouter = { push: mockPush };

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

const mockOnCreateProject = jest.fn();
const mockOnCreateIssue = jest.fn();

function pressOnDocument(key: string) {
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("/ shortcut — command-center in-page search", () => {
  it("calls focus on [data-search-input] when / is pressed", () => {
    const searchEl = document.createElement("input");
    searchEl.setAttribute("data-search-input", "");
    const focusSpy = jest.fn();
    searchEl.focus = focusSpy;
    document.body.appendChild(searchEl);

    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    pressOnDocument("/");

    expect(focusSpy).toHaveBeenCalled();
    document.body.removeChild(searchEl);
  });

  it("does not focus the search input when a non-slash key is pressed", () => {
    const searchEl = document.createElement("input");
    searchEl.setAttribute("data-search-input", "");
    const focusSpy = jest.fn();
    searchEl.focus = focusSpy;
    document.body.appendChild(searchEl);

    renderHook(() =>
      useKeyboardShortcuts(mockOnCreateProject, mockOnCreateIssue),
    );
    pressOnDocument("g");

    expect(focusSpy).not.toHaveBeenCalled();
    document.body.removeChild(searchEl);
  });
});
