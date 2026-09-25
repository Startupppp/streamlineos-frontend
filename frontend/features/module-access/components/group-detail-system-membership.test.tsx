/**
 * HRMS-E2E-010. HR Access > Roles offered three groups — Hr Module Admin,
 * Hr Module Member, Hr Module Owner — each reading "0 members", and opening
 * Members showed "No members are assigned to this group yet." with no way to add
 * one. That is the viewer copy, shown to an org owner: assignment was impossible
 * from the only screen that offers it, so nobody could ever be given
 * `hr:leaves:approve`, which is what leaves 011, 012 and 013 stuck behind it.
 *
 * The cause was one expression — `canManage && !group.isSystem` — handed to the
 * member sheet. All three HR groups are system groups, so all three were
 * read-only for everybody.
 *
 * A system group's **permission set** is read-only, and should stay that way:
 * what "Hr Module Admin" grants is the product's decision, and the reconciler
 * rewrites it at boot anyway. Its **membership** is the opposite — deciding who
 * is an HR admin is exactly the thing an org owner is for. Conflating the two is
 * the defect, so these assertions hold them apart, and the backend agrees:
 * `addGroupMember` has no `isSystem` guard at all.
 */
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GroupDetailPanel } from "./group-detail-panel";

const memberSheetProps = jest.fn();
const pickerProps = jest.fn();

jest.mock("@/features/module-access/components/page-action-picker", () => ({
  PageActionPicker: (props: Record<string, unknown>) => {
    pickerProps(props);
    return <div data-testid="permission-picker" data-read-only={String(props.readOnly)} />;
  },
}));

jest.mock("./member-assignment-sheet", () => ({
  MemberAssignmentSheet: (props: Record<string, unknown>) => {
    memberSheetProps(props);
    return <div data-testid="member-sheet" data-can-manage={String(props.canManage)} />;
  },
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

const setPermissions = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };

jest.mock("@/hooks/api/module-access", () => ({
  useSetModuleGroupPermissions: () => setPermissions,
  useModuleGroupMembers: () => ({ data: [], isLoading: false }),
  useAddModuleGroupMember: () => ({ mutate: jest.fn(), isPending: false }),
  useRemoveModuleGroupMember: () => ({ mutate: jest.fn(), isPending: false }),
}));

// The real ModulePermission shape (hooks/api/module-access/types.ts:9), not an
// invented one — a fixture that does not match the callee tests nothing.
const CATALOG = [
  { name: "hr:leaves:approve", resource: "leaves", action: "approve", description: "Approve leave" },
  { name: "hr:employees:view", resource: "employees", action: "view", description: "View employees" },
];

function makeGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    name: "Hr Module Admin",
    isSystem: true,
    memberCount: 0,
    version: 1,
    permissions: [{ permissionKey: "hr:employees:view", scope: "all" }],
    ...overrides,
  };
}

function renderPanel(group: Record<string, unknown>, canManage = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      {/* The panel's props are typed against the module-access contracts; the
          fixtures above are those shapes. */}
      <GroupDetailPanel
        group={group as never}
        catalog={CATALOG as never}
        moduleKey="hr"
        canManage={canManage}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  memberSheetProps.mockClear();
});

describe("a system role group's membership is still assignable", () => {
  it("lets an org admin manage who is in a system group", async () => {
    renderPanel(makeGroup());
    await userEvent.click(screen.getByRole("button", { name: /Members/ }));

    expect(screen.getByTestId("member-sheet")).toHaveAttribute("data-can-manage", "true");
  });

  it("lets an org admin manage who is in a custom group too", async () => {
    // The paired positive from the other direction: custom groups were never
    // broken, so this is what the system case must match.
    renderPanel(makeGroup({ isSystem: false, name: "Hiring managers" }));
    await userEvent.click(screen.getByRole("button", { name: /Members/ }));

    expect(screen.getByTestId("member-sheet")).toHaveAttribute("data-can-manage", "true");
  });

  it("still refuses membership changes to someone who cannot manage the module", async () => {
    renderPanel(makeGroup(), false);
    await userEvent.click(screen.getByRole("button", { name: /Members/ }));

    expect(screen.getByTestId("member-sheet")).toHaveAttribute("data-can-manage", "false");
  });

  it("keeps a system group's permission set read-only", () => {
    // The distinction this whole change rests on. Membership opens up; what the
    // group grants does not, because the reconciler owns that at boot.
    renderPanel(makeGroup());

    expect(screen.getByTestId("permission-picker")).toHaveAttribute("data-read-only", "true");
  });

  it("leaves a custom group's permission set editable", () => {
    renderPanel(makeGroup({ isSystem: false, name: "Hiring managers" }));

    expect(screen.getByTestId("permission-picker")).toHaveAttribute("data-read-only", "false");
  });
});
