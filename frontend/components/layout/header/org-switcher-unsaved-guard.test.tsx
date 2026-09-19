import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useRegisterBuildDirtyState, BuildDirtyStateProvider } from "@/features/build/navigation/build-dirty-state-context";
import { WorkspaceSwitcher } from "./org-switcher";

const mockSwitch = jest.fn();

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1" } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { isOrgOwner: false } }),
}));

jest.mock("@/hooks/common/auth-hooks", () => ({
  useGetOrganizations: () => ({
    data: [
      { id: "org-1", name: "Current organization" },
      { id: "org-2", name: "Target organization" },
    ],
  }),
  useSwitchOrg: () => ({ mutate: mockSwitch, isPending: false }),
}));

jest.mock("next/dynamic", () => {
  let invocation = 0;
  return () => {
    invocation += 1;
    if (invocation !== 3) return function DeferredDialog() { return null; };
    return function SwitcherPanel(props: { onSwitch: (orgId: string) => void }) {
      function handleSwitch() {
        props.onSwitch("org-2");
      }

      return (
        <button type="button" onClick={handleSwitch}>
          Switch to target organization
        </button>
      );
    };
  };
});

jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <>{children}</> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

function DirtySurface() {
  useRegisterBuildDirtyState(true);
  return null;
}

it("does not switch organizations until the user discards Build changes", () => {
  render(
    <BuildDirtyStateProvider>
      <DirtySurface />
      <WorkspaceSwitcher drawerOnly open onOpenChange={jest.fn()} />
    </BuildDirtyStateProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Switch to target organization" }));

  expect(mockSwitch).not.toHaveBeenCalled();
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Discard" }));
  expect(mockSwitch).toHaveBeenCalledWith("org-2");
});
