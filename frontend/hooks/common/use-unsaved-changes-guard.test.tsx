import { render, screen, fireEvent, act } from "@testing-library/react";
import { useUnsavedChangesGuard } from "./use-unsaved-changes-guard";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

function Harness({
  isDirty,
  handleBrowserBack = false,
  onNavigate,
}: {
  isDirty: boolean;
  handleBrowserBack?: boolean;
  onNavigate?: () => void;
}) {
  const { requestLeave, dialogProps } = useUnsavedChangesGuard({
    isDirty,
    handleBrowserBack,
  });

  function handleClick() {
    requestLeave(() => onNavigate?.());
  }

  return (
    <>
      <button type="button" onClick={handleClick}>
        Navigate
      </button>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  );
}

describe("useUnsavedChangesGuard — requestLeave", () => {
  it("runs the action immediately when not dirty", () => {
    const onNavigate = jest.fn();
    render(<Harness isDirty={false} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: "Navigate" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("blocks the action and shows the dialog when dirty", () => {
    const onNavigate = jest.fn();
    render(<Harness isDirty={true} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: "Navigate" }));

    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("runs the action after the user chooses Discard", () => {
    const onNavigate = jest.fn();
    render(<Harness isDirty={true} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: "Navigate" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does not run the action when the user keeps editing", () => {
    const onNavigate = jest.fn();
    render(<Harness isDirty={true} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: "Navigate" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("useUnsavedChangesGuard — handleBrowserBack popstate", () => {
  let historyGoSpy: jest.SpyInstance;
  let historyBackSpy: jest.SpyInstance;

  beforeEach(() => {
    historyGoSpy = jest.spyOn(window.history, "go").mockImplementation(() => undefined);
    historyBackSpy = jest.spyOn(window.history, "back").mockImplementation(() => undefined);
  });

  afterEach(() => {
    historyGoSpy.mockRestore();
    historyBackSpy.mockRestore();
  });

  it("does not add a popstate guard when handleBrowserBack is false", () => {
    render(<Harness isDirty={true} handleBrowserBack={false} />);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(historyGoSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("calls history.go(1) and shows the dialog when popstate fires while dirty and handleBrowserBack is true", () => {
    render(<Harness isDirty={true} handleBrowserBack={true} />);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(historyGoSpy).toHaveBeenCalledWith(1);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("does not show the dialog when popstate fires but dirty is false", () => {
    render(<Harness isDirty={false} handleBrowserBack={true} />);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(historyGoSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("calls history.back() when the user discards after a browser-back popstate", () => {
    render(<Harness isDirty={true} handleBrowserBack={true} />);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(historyBackSpy).toHaveBeenCalledTimes(1);
  });

  it("does not call history.back() when the user keeps editing after a browser-back popstate", () => {
    render(<Harness isDirty={true} handleBrowserBack={true} />);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(historyBackSpy).not.toHaveBeenCalled();
  });

  it("skips the second popstate fired by history.go(1) so the dialog does not show twice", () => {
    render(<Harness isDirty={true} handleBrowserBack={true} />);

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(historyGoSpy).toHaveBeenCalledTimes(1);
  });

  it("does not add a listener when not mounted inside a browser environment — effect never runs when window is absent", () => {
    expect(() => {
      render(<Harness isDirty={true} handleBrowserBack={true} />);
    }).not.toThrow();
  });
});
