import React from "react";
import { render, screen } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { useIsChatPanelNarrow } from "./use-chat-mobile";
import { MessagePanelSidePanels } from "./message-panel-side-panels";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: React.forwardRef(
      (
        { children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>,
        ref: React.Ref<HTMLDivElement>,
      ) => (
        <div ref={ref} className={className} data-testid="motion-panel" {...rest}>
          {children}
        </div>
      ),
    ),
  },
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (v: boolean) => void;
  }) => (open ? <div data-testid="sheet-open">{children}</div> : null),
  SheetContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div role="dialog" data-testid="sheet-content" className={className}>
      {children}
    </div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("next/dynamic", () => {
  return (
    _fn: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>,
    _opts: unknown,
  ) => {
    const Stub = (props: Record<string, unknown>) => (
      <div data-testid="dynamic-stub" data-props={JSON.stringify(Object.keys(props))} />
    );
    return Stub;
  };
});

function makeMatchMedia(viewportWidth: number) {
  return (query: string): MediaQueryList => {
    const m = /\(max-width:\s*(\d+)px\)/.exec(query);
    const threshold = m ? parseInt(m[1] ?? "0", 10) : 0;
    const matches = viewportWidth <= threshold;
    return {
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as MediaQueryList;
  };
}

describe("useIsChatPanelNarrow — breakpoint boundaries", () => {
  const cases: [number, boolean][] = [
    [639, true],
    [640, true],
    [767, true],
    [768, true],
    [1023, true],
    [1024, false],
  ];

  for (const [width, expected] of cases) {
    it(`returns ${String(expected)} at ${width}px`, () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: makeMatchMedia(width),
      });
      const { result } = renderHook(() => useIsChatPanelNarrow());
      act(() => undefined);
      expect(result.current).toBe(expected);
    });
  }
});

const noop = () => undefined;
const noopBool = (_: boolean) => undefined;

function renderPanels(isPanelNarrow: boolean, showSavedPanel: boolean) {
  return render(
    <MessagePanelSidePanels
      channelId={1}
      isPanelNarrow={isPanelNarrow}
      showSavedPanel={showSavedPanel}
      setShowSavedPanel={noopBool}
      showFilesPanel={false}
      setShowFilesPanel={noopBool}
      forwardMessage={null}
      setForwardMessage={noop}
    />,
  );
}

describe("MessagePanelSidePanels — no gap, no double-mount", () => {
  it("renders the Sheet overlay at narrow widths (639px zone)", () => {
    renderPanels(true, true);
    expect(screen.getByTestId("sheet-open")).toBeInTheDocument();
    expect(screen.queryByTestId("motion-panel")).toBeNull();
  });

  it("renders the Sheet overlay at narrow widths (1023px zone)", () => {
    renderPanels(true, true);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByTestId("motion-panel")).toBeNull();
  });

  it("renders the motion panel at wide widths (1024px zone)", () => {
    renderPanels(false, true);
    expect(screen.getByTestId("motion-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("sheet-open")).toBeNull();
  });

  it("mounts the panel content only once — no double-mount at any breakpoint (narrow)", () => {
    renderPanels(true, true);
    expect(screen.getAllByTestId("dynamic-stub")).toHaveLength(1);
    expect(screen.queryByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByTestId("motion-panel")).toBeNull();
  });

  it("mounts the panel content only once — no double-mount at any breakpoint (wide)", () => {
    renderPanels(false, true);
    expect(screen.getAllByTestId("dynamic-stub")).toHaveLength(1);
    expect(screen.queryByTestId("motion-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("sheet-open")).toBeNull();
  });

  it("SheetContent carries no sm:hidden class (no responsive blind zone)", () => {
    renderPanels(true, true);
    const content = screen.getByTestId("sheet-content");
    expect(content.className).not.toContain("sm:hidden");
  });

  it("renders nothing when the panel is closed (no stale focus traps)", () => {
    renderPanels(true, false);
    expect(screen.queryByTestId("sheet-open")).toBeNull();
    expect(screen.queryByTestId("motion-panel")).toBeNull();
  });
});
