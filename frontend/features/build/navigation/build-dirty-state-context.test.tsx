import { render, screen, fireEvent } from "@testing-library/react";
import { useRouter } from "next/navigation";
import {
  BuildDirtyStateProvider,
  useRegisterBuildDirtyState,
  useBuildHasUnsavedWork,
} from "./build-dirty-state-context";
import { useUnsavedChangesGuard } from "@/hooks/common/use-unsaved-changes-guard";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockedUseRouter = jest.mocked(useRouter);

interface DirtySurfaceProps {
  isDirty: boolean;
}

function DirtySurface({ isDirty }: DirtySurfaceProps) {
  useRegisterBuildDirtyState(isDirty);
  return null;
}

function ScopeSwitcher() {
  const router = useRouter();
  const hasUnsavedWork = useBuildHasUnsavedWork();
  const { requestLeave, dialogProps } = useUnsavedChangesGuard({
    isDirty: hasUnsavedWork,
  });

  function handleSwitchScope() {
    requestLeave(() => router.push("/build/target"));
  }

  return (
    <>
      <button type="button" onClick={handleSwitchScope}>
        Switch scope
      </button>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  );
}

function HasUnsavedWorkProbe() {
  const hasUnsavedWork = useBuildHasUnsavedWork();
  return <span>{hasUnsavedWork ? "dirty" : "clean"}</span>;
}

function renderHarness(surfaces: React.ReactNode) {
  return render(
    <BuildDirtyStateProvider>
      {surfaces}
      <ScopeSwitcher />
    </BuildDirtyStateProvider>,
  );
}

function clickSwitchScope() {
  fireEvent.click(screen.getByRole("button", { name: "Switch scope" }));
}

beforeEach(() => {
  pushMock.mockClear();
  mockedUseRouter.mockReturnValue({
    push: pushMock,
  } as unknown as ReturnType<typeof useRouter>);
});

describe("build dirty state wiring", () => {
  test("a scope switch with no dirty surface navigates immediately without showing a dialog", () => {
    renderHarness(<DirtySurface isDirty={false} />);

    clickSwitchScope();

    expect(pushMock).toHaveBeenCalledWith("/build/target");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("a scope switch with a dirty registered surface shows the dialog and does not navigate", () => {
    renderHarness(<DirtySurface isDirty={true} />);

    clickSwitchScope();

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  test("choosing discard then navigates to the requested href", () => {
    renderHarness(<DirtySurface isDirty={true} />);

    clickSwitchScope();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(pushMock).toHaveBeenCalledWith("/build/target");
  });

  test("choosing keep editing leaves the user where they are and the href is not pushed", () => {
    renderHarness(<DirtySurface isDirty={true} />);

    clickSwitchScope();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("unmounting the dirty surface clears the dirty state so the next switch is immediate", () => {
    const { rerender } = renderHarness(<DirtySurface isDirty={true} />);

    rerender(
      <BuildDirtyStateProvider>
        <ScopeSwitcher />
      </BuildDirtyStateProvider>,
    );
    clickSwitchScope();

    expect(pushMock).toHaveBeenCalledWith("/build/target");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("two registered surfaces where only one is dirty still blocks", () => {
    renderHarness(
      <>
        <DirtySurface isDirty={false} />
        <DirtySurface isDirty={true} />
      </>,
    );

    clickSwitchScope();

    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  test("useBuildHasUnsavedWork returns false with no provider mounted", () => {
    render(<HasUnsavedWorkProbe />);

    expect(screen.getByText("clean")).toBeInTheDocument();
  });
});
