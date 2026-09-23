import { render, screen } from "@testing-library/react";
import { RolesTab } from "./roles-tab";

const mockRename = { mutate: jest.fn(), isPending: false };
const mockDelete = { mutate: jest.fn(), isPending: false };

let viewAccess: "loading" | "granted" | "denied" = "granted";

jest.mock("@/hooks/api/access", () => ({
  useCanState: () => viewAccess,
}));

jest.mock("@/hooks/api/module-access", () => ({
  useModuleAccessCatalog: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useModuleRoleGroups: () => ({
    data: {
      pages: [
        {
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
          pagination: { limit: 100, nextCursor: null, hasMore: false },
        },
      ],
      pageParams: [undefined],
    },
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

describe("RolesTab access resolution", () => {
  afterEach(() => {
    viewAccess = "granted";
  });

  it("shows a skeleton, not an empty list, while access is still resolving", () => {
    viewAccess = "loading";
    render(<RolesTab moduleKey="hr" canManage={false} />);

    expect(screen.queryByText("Hiring managers")).not.toBeInTheDocument();
    expect(screen.queryByText(/no role groups/i)).not.toBeInTheDocument();
  });

  it("tells a denied viewer they lack access instead of showing an empty list", () => {
    viewAccess = "denied";
    render(<RolesTab moduleKey="hr" canManage={false} />);

    expect(screen.queryByText(/no role groups/i)).not.toBeInTheDocument();
  });
});

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
