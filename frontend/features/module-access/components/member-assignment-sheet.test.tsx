import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemberAssignmentSheet } from "./member-assignment-sheet";

const mockAddMember = { mutate: jest.fn(), isPending: false };
const mockRemoveMember = { mutate: jest.fn(), isPending: false };

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: () => <div data-testid="member-picker" />,
}));

jest.mock("@/hooks/api/module-access", () => ({
  useModuleGroupMembers: () => ({
    data: [
      {
        userId: "user-1",
        displayName: "Alex Morgan",
        email: "alex@example.com",
        avatarUrl: null,
      },
    ],
    isLoading: false,
  }),
  useAddModuleGroupMember: () => mockAddMember,
  useRemoveModuleGroupMember: () => mockRemoveMember,
}));

describe("MemberAssignmentSheet mutation controls", () => {
  const commonProps = {
    open: true,
    onOpenChange: jest.fn(),
    moduleKey: "hr",
    groupId: 7,
    groupName: "Hiring managers",
  };

  it("keeps membership visible but hides add and remove controls from viewers", () => {
    render(<MemberAssignmentSheet {...commonProps} canManage={false} />);

    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.queryByTestId("member-picker")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Alex Morgan" }),
    ).not.toBeInTheDocument();
  });

  it("shows add and remove controls to authorized managers", () => {
    render(<MemberAssignmentSheet {...commonProps} canManage />);

    expect(screen.getByTestId("member-picker")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Alex Morgan" }),
    ).toBeInTheDocument();
  });
});
