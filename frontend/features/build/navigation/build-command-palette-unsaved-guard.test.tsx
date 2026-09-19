import { fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import {
  BuildDirtyStateProvider,
  useRegisterBuildDirtyState,
  useBuildRequestLeave,
} from "./build-dirty-state-context";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockedUseRouter = jest.mocked(useRouter);

function DirtySurface({ isDirty }: { isDirty: boolean }) {
  useRegisterBuildDirtyState(isDirty);
  return null;
}

function CommandPaletteNavItem({ href }: { href: string }) {
  const router = useRouter();
  const requestLeave = useBuildRequestLeave();

  function handleSelect() {
    requestLeave(() => router.push(href));
  }

  return (
    <button type="button" onClick={handleSelect}>
      Navigate
    </button>
  );
}

function renderHarness(isDirty: boolean) {
  return render(
    <BuildDirtyStateProvider>
      <DirtySurface isDirty={isDirty} />
      <CommandPaletteNavItem href="/build/42/issues" />
    </BuildDirtyStateProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
  mockedUseRouter.mockReturnValue({
    push,
  } as unknown as ReturnType<typeof useRouter>);
});

describe("BSN-04-014 command-palette navigation honours the unsaved-work guard", () => {
  test("navigates immediately when no Build surface is dirty", () => {
    renderHarness(false);

    fireEvent.click(screen.getByRole("button", { name: "Navigate" }));

    expect(push).toHaveBeenCalledWith("/build/42/issues");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("blocks navigation and shows the unsaved-changes dialog when a Build surface is dirty", () => {
    renderHarness(true);

    fireEvent.click(screen.getByRole("button", { name: "Navigate" }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  test("navigates to the requested href after the user discards changes", () => {
    renderHarness(true);

    fireEvent.click(screen.getByRole("button", { name: "Navigate" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(push).toHaveBeenCalledWith("/build/42/issues");
    expect(push).toHaveBeenCalledTimes(1);
  });

  test("does not navigate when the user chooses to keep editing", () => {
    renderHarness(true);

    fireEvent.click(screen.getByRole("button", { name: "Navigate" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("useBuildRequestLeave falls back to immediate navigation when mounted outside BuildDirtyStateProvider", () => {
    render(<CommandPaletteNavItem href="/build/roadmap" />);

    fireEvent.click(screen.getByRole("button", { name: "Navigate" }));

    expect(push).toHaveBeenCalledWith("/build/roadmap");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
