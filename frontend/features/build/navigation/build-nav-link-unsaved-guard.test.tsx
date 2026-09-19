import { render, screen, fireEvent } from "@testing-library/react";
import { FolderIcon } from "lucide-react";
import { BuildNavLink } from "./build-nav-link";
import {
  BuildDirtyStateProvider,
  useRegisterBuildDirtyState,
} from "./build-dirty-state-context";
import type { BuildNavDestination } from "@/lib/build/nav/build-nav-destination";
import type { ModuleAccent } from "@/components/layout/sidebar/sidebar-nav-items";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("@/components/layout/nav-intent-prefetch", () => ({
  useNavIntentPrefetch: () => jest.fn(),
}));

jest.mock("@/components/layout/nav-pending-indicator", () => ({
  NavPendingIndicator: () => null,
}));

const destination: BuildNavDestination = {
  id: "project-issues",
  label: "Issues",
  href: "/build/42/issues",
  icon: FolderIcon,
  requiredPermission: "build:tickets:view",
};

const accent: ModuleAccent = {
  bg: "",
  text: "",
  indicator: "",
} as ModuleAccent;

function DirtySurface({ isDirty }: { isDirty: boolean }) {
  useRegisterBuildDirtyState(isDirty);
  return null;
}

function renderLink(isDirty: boolean) {
  return render(
    <BuildDirtyStateProvider>
      <DirtySurface isDirty={isDirty} />
      <BuildNavLink
        destination={destination}
        isActive={false}
        isCollapsed={false}
        accent={accent}
      />
    </BuildDirtyStateProvider>,
  );
}

describe("BuildNavLink — BSN-04-014 sidebar links honour the unsaved-work guard", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("navigates immediately when no Build surface holds unsaved work", () => {
    renderLink(false);

    fireEvent.click(screen.getByRole("link", { name: /issues/i }));

    expect(push).toHaveBeenCalledWith("/build/42/issues");
  });

  it("blocks navigation and prompts when a Build surface is dirty", () => {
    renderLink(true);

    fireEvent.click(screen.getByRole("link", { name: /issues/i }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("navigates once the user discards, without double navigation", () => {
    renderLink(true);

    fireEvent.click(screen.getByRole("link", { name: /issues/i }));
    fireEvent.click(screen.getByRole("button", { name: /discard/i }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/build/42/issues");
  });

  it("leaves a modifier-click to the browser so opening in a new tab still works", () => {
    renderLink(true);

    fireEvent.click(screen.getByRole("link", { name: /issues/i }), {
      metaKey: true,
    });

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
