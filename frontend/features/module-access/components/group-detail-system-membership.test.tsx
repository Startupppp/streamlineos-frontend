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

jest.mock("@/hooks/api/module-access", () => ({
  useModuleGroupMembers: () => ({ data: [], isLoading: false }),
  useAddModuleGroupMember: () => ({ mutate: jest.fn(), isPending: false }),
  useRemoveModuleGroupMember: () => ({ mutate: jest.fn(), isPending: false }),
}));

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
    renderPanel(makeGroup());

    expect(screen.getByTestId("permission-picker")).toHaveAttribute("data-read-only", "true");
  });

  it("BE-102: shows a custom group's permission set read-only too, with no Save control", () => {
    renderPanel(makeGroup({ isSystem: false, name: "Hiring managers" }));

    expect(screen.getByTestId("permission-picker")).toHaveAttribute("data-read-only", "true");
    expect(screen.queryByRole("button", { name: /Save/ })).not.toBeInTheDocument();
  });
});
