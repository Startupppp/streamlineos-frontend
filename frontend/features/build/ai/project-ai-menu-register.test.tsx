import { render, act } from "@testing-library/react";
import { ProjectAiMenu } from "./project-ai-menu";

const mutateAsync = jest.fn();
const execute = jest.fn();
const handleOpenChange = jest.fn();
const retry = jest.fn();
const cancel = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/hooks/api/build/ai", () => ({
  useProjectAiSummary: () => ({ mutateAsync, isPending: false }),
}));

jest.mock("@/components/ai/use-ai-popover-action", () => ({
  useAiPopoverAction: () => ({
    open: false,
    state: { status: "loading" },
    isPending: false,
    execute,
    retry,
    cancel,
    handleOpenChange,
  }),
}));

jest.mock("@/components/ai", () => ({
  AiActionResultBody: () => <div data-testid="ai-body" />,
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("ProjectAiMenu runRef registration", () => {
  beforeEach(() => {
    execute.mockClear();
    mutateAsync.mockClear();
  });

  it("assigns the run callback to the parent ref in layout effect without calling execute", () => {
    const mutable = { current: null as (() => void) | null };

    render(<ProjectAiMenu projectId={1} hideTrigger runRef={mutable} />);

    expect(execute).not.toHaveBeenCalled();
    expect(typeof mutable.current).toBe("function");

    act(() => {
      mutable.current?.();
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("clears the parent ref on unmount so a stale click cannot fire", () => {
    const mutable = { current: null as (() => void) | null };
    const view = render(<ProjectAiMenu projectId={1} hideTrigger runRef={mutable} />);
    expect(mutable.current).not.toBeNull();
    view.unmount();
    expect(mutable.current).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });
});
