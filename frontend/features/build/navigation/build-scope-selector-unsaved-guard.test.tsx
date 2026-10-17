import { fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import {
  DirtyStateProvider,
  useRegisterDirtyState,
} from "@/components/shared/dirty-state-context";
import { BuildScopeSelector } from "./build-scope-selector";
import { ORGANIZATION_BUILD_SCOPE } from "@/lib/build/build-scope";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BuildScopeRef } from "./build-nav-storage";
import type { BuildScopeIdentity } from "./use-build-scope-identity";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

jest.mock("./use-build-nav-preferences", () => ({
  useBuildScopeRecents: () => ({
    recents: [],
    recordScope: jest.fn(),
    replaceRecents: jest.fn(),
  }),
  useBuildScopeStars: () => ({
    starred: [],
    toggleStar: jest.fn(),
    replaceStarred: jest.fn(),
  }),
}));

const fakeIdentity: BuildScopeIdentity = {
  ref: {
    key: "organization",
    type: "organization",
    id: "organization",
    name: "Acme Corp",
    parentPath: null,
    parentKey: null,
    projectKey: null,
    href: "/build",
  },
  isLoading: false,
  isArchived: false,
  isInaccessible: false,
};

jest.mock("./use-build-scope-identity", () => ({
  useBuildScopeIdentity: () => fakeIdentity,
}));

const targetRef: BuildScopeRef = {
  key: "project:99",
  type: "project",
  id: "99",
  name: "Target Project",
  parentPath: "Acme Corp",
  parentKey: "organization",
  projectKey: "TGT",
  href: "/build/99",
};

jest.mock("./build-scope-browser", () => ({
  BuildScopeBrowser: ({
    onSelect,
  }: {
    onSelect: (ref: BuildScopeRef) => void;
    currentScopeKey: string;
    settingsHrefFor: (ref: BuildScopeRef) => string | null;
  }) => {
    return (
      <button type="button" onClick={() => onSelect(targetRef)}>
        Select target project
      </button>
    );
  },
}));

jest.mock("@/components/ui/responsive-popover", () => ({
  ResponsivePopover: ({
    children,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
  }) => <div>{children}</div>,
  ResponsivePopoverTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div>{children}</div>,
  ResponsivePopoverContent: ({
    children,
  }: {
    children: React.ReactNode;
    title?: string;
    align?: string;
    side?: string;
    sideOffset?: number;
    className?: string;
  }) => <div>{children}</div>,
}));

function DirtySurface({ isDirty }: { isDirty: boolean }) {
  useRegisterDirtyState(isDirty);
  return null;
}

function renderSelector(isDirty: boolean, isCollapsed = false) {
  return render(
    <TooltipProvider>
      <DirtyStateProvider>
        <DirtySurface isDirty={isDirty} />
        <BuildScopeSelector
          scope={ORGANIZATION_BUILD_SCOPE}
          isCollapsed={isCollapsed}
        />
      </DirtyStateProvider>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
  jest.mocked(useRouter).mockReturnValue({
    push,
  } as unknown as ReturnType<typeof useRouter>);
});

describe("BuildScopeSelector — BSN-04-014 scope selector honours the unsaved-work guard", () => {
  it("navigates immediately when no Build surface is dirty", () => {
    renderSelector(false);

    fireEvent.click(screen.getByRole("button", { name: "Select target project" }));

    expect(push).toHaveBeenCalledWith("/build/99");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("blocks navigation and shows the dialog when a Build surface is dirty", () => {
    renderSelector(true);

    fireEvent.click(screen.getByRole("button", { name: "Select target project" }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("navigates to the selected scope after the user discards changes", () => {
    renderSelector(true);

    fireEvent.click(screen.getByRole("button", { name: "Select target project" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(push).toHaveBeenCalledWith("/build/99");
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("does not navigate when the user chooses to keep editing", () => {
    renderSelector(true);

    fireEvent.click(screen.getByRole("button", { name: "Select target project" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the collapsed trigger available without nesting tooltip and popover refs on the button", () => {
    renderSelector(false, true);

    expect(
      screen.getByRole("button", { name: /switch build scope/i }),
    ).toBeInTheDocument();
  });
});
