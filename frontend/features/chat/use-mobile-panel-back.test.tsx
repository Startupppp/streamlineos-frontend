import { useCallback, useState } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMobilePanelBack } from "./use-mobile-panel-back";

function mockViewport(width: number) {
  window.matchMedia = jest.fn((query: string) => {
    const max = Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? Infinity);
    return {
      matches: width <= max,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });
}

function usePanel() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useMobilePanelBack(open, close);
  return { open, setOpen };
}

function holdsPanelEntry(): boolean {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null && "chatPanelEntry" in state;
}

const CHANNEL_URL = "/chat?channel=5";

let pushes: jest.SpyInstance;

beforeEach(() => {
  window.history.replaceState(null, "", CHANNEL_URL);
  pushes = jest.spyOn(window.history, "pushState");
});

afterEach(() => {
  pushes.mockRestore();
});

describe("useMobilePanelBack at 375px", () => {
  beforeEach(() => mockViewport(375));

  it("opening a panel pushes one history entry on the same URL", () => {
    const { result } = renderHook(usePanel);
    act(() => result.current.setOpen(true));
    expect(pushes).toHaveBeenCalledTimes(1);
    expect(holdsPanelEntry()).toBe(true);
    expect(`${window.location.pathname}${window.location.search}`).toBe(CHANNEL_URL);
  });

  it("Back closes only the panel and leaves the channel open", async () => {
    const { result } = renderHook(usePanel);
    act(() => result.current.setOpen(true));
    act(() => window.history.back());
    await waitFor(() => expect(result.current.open).toBe(false));
    expect(holdsPanelEntry()).toBe(false);
    expect(`${window.location.pathname}${window.location.search}`).toBe(CHANNEL_URL);
  });

  it("closing the panel from its own control consumes the entry, so the next Back leaves the channel", async () => {
    const { result } = renderHook(usePanel);
    act(() => result.current.setOpen(true));
    act(() => result.current.setOpen(false));
    await waitFor(() => expect(holdsPanelEntry()).toBe(false));
    expect(result.current.open).toBe(false);
  });

  it("reopening reuses the pending entry instead of stacking a second one", async () => {
    const { result } = renderHook(usePanel);
    act(() => result.current.setOpen(true));
    act(() => result.current.setOpen(false));
    act(() => result.current.setOpen(true));
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(pushes).toHaveBeenCalledTimes(1);
    expect(holdsPanelEntry()).toBe(true);
    expect(result.current.open).toBe(true);
  });
});

describe("useMobilePanelBack from md up", () => {
  beforeEach(() => mockViewport(1280));

  it("adds no history entry, so desktop panel changes keep replacing", () => {
    const { result } = renderHook(usePanel);
    act(() => result.current.setOpen(true));
    expect(pushes).not.toHaveBeenCalled();
    expect(holdsPanelEntry()).toBe(false);
  });

  it("treats 768px as md", () => {
    mockViewport(768);
    const { result } = renderHook(usePanel);
    act(() => result.current.setOpen(true));
    expect(pushes).not.toHaveBeenCalled();
  });
});
