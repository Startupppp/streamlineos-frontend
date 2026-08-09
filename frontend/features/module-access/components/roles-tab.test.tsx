import { render, screen } from "@testing-library/react";
import { RolesTab } from "./roles-tab";

const mockRename = { mutate: jest.fn(), isPending: false };
const mockDelete = { mutate: jest.fn(), isPending: false };

jest.mock("@/hooks/api/module-access", () => ({
  useModuleAccessCatalog: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useModuleRoleGroups: () => ({
    data: [
      {
        id: 7,
        name: "Hiring managers",
        isSystem: false,
        version: 1,
        memberCount: 2,
        permissions: [],
      },
    ],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useRenameModuleRoleGroup: () => mockRename,
  useDeleteModuleRoleGroup: () => mockDelete,
}));

jest.mock("@/features/module-access/components/create-group-dialog", () => ({
  CreateGroupDialog: () => <div data-testid="create-group-dialog" />,
}));

jest.mock("@/features/module-access/components/group-detail-panel", () => ({
  GroupDetailPanel: () => null,
  GroupDetailSkeleton: () => null,
}));

describe("RolesTab mutation controls", () => {
  it("renders custom role groups without mutation controls for read-only viewers", () => {
    render(<RolesTab moduleKey="hr" canManage={false} />);

    expect(screen.getByText("Hiring managers")).toBeInTheDocument();
    expect(screen.queryByLabelText("Rename group")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete group")).not.toBeInTheDocument();
    expect(screen.queryByTestId("create-group-dialog")).not.toBeInTheDocument();
  });

  it("renders role mutation controls for authorized managers", () => {
    render(<RolesTab moduleKey="hr" canManage />);

    expect(screen.getByLabelText("Rename group")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete group")).toBeInTheDocument();
    expect(screen.getByTestId("create-group-dialog")).toBeInTheDocument();
  });
});
