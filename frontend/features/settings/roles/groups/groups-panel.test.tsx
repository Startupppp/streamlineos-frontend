import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PrincipalGroup } from "@/hooks/api/principal-groups";
import { GroupsPanel } from "./groups-panel";

const mockDeleteMutate = jest.fn();

const GROUPS: PrincipalGroup[] = [
  {
    id: "g-custom",
    name: "QA1015 role",
    kind: "CUSTOM",
    orgUnitId: null,
    memberCount: 2,
    roleCount: 1,
    createdAt: "2026-10-15T00:00:00.000Z",
  },
  {
    id: "g-unit",
    name: "Engineering",
    kind: "ORG_UNIT",
    orgUnitId: "ou-1",
    memberCount: 5,
    roleCount: 2,
    createdAt: "2026-10-15T00:00:00.000Z",
  },
];

jest.mock("@/hooks/api/principal-groups", () => ({
  usePrincipalGroups: () => ({
    data: { data: GROUPS, pagination: { limit: 20, nextCursor: null, hasMore: false } },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useDeleteGroup: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

jest.mock("./create-group-dialog", () => ({ CreateGroupDialog: () => null }));
jest.mock("./group-detail-sheet", () => ({ GroupDetailSheet: () => null }));
jest.mock("./rename-group-dialog", () => ({ RenameGroupDialog: () => null }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

describe("GroupsPanel permission-group delete (ORG-B-009)", () => {
  it("offers Delete on a custom group and deletes it only after the destructive confirm", async () => {
    render(<GroupsPanel />);
    expect(screen.getAllByRole("button", { name: "Delete group" })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Delete group" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Deleting "QA1015 role"/)).toBeInTheDocument();
    expect(mockDeleteMutate).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete group" }));
    expect(mockDeleteMutate).toHaveBeenCalledWith({ groupId: "g-custom" }, expect.any(Object));
  });
});
