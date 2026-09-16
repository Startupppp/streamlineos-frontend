import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProjectView } from "@/types/projects";
import { AllWorkViewsMenu } from "./all-work-views-menu";

const mockView: ProjectView = {
  id: 12, projectId: null, orgId: "org-1", createdBy: "owner-1",
  name: "My urgent work", filters: { priority: "urgent" }, groupBy: null,
  orderBy: null, layoutType: "list", isPinned: false, visibility: "private",
  scope: "workspace", displayOptions: null, createdAt: null, updatedAt: null,
};

const mockReplace = jest.fn();
const mockUpdateView = jest.fn();
const mockDeleteView = jest.fn();
let mockCurrentUserId = "other-1";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/build/all-work",
  useSearchParams: () => new URLSearchParams("status=old&page=3"),
}));
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: mockCurrentUserId } } }),
}));
jest.mock("@/hooks/api/build/advanced", () => ({
  useWorkspaceViews: () => ({ data: [mockView], isLoading: false, isError: false }),
  useCreateWorkspaceView: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateWorkspaceView: () => ({ mutate: mockUpdateView }),
  useDeleteWorkspaceView: () => ({ mutate: mockDeleteView }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUserId = "other-1";
});

it("applies a saved view through the menu with Enter and Space, but not other keys", async () => {
  const user = userEvent.setup();
  render(<AllWorkViewsMenu activeView="list" hasActiveFilters={false} />);
  await user.click(screen.getByRole("button", { name: "Views" }));
  const row = screen.getByRole("button", { name: mockView.name });
  fireEvent.keyDown(row, { key: "ArrowDown" });
  expect(mockReplace).not.toHaveBeenCalled();
  fireEvent.keyDown(row, { key: "Enter" });
  await user.click(screen.getByRole("button", { name: "Views" }));
  fireEvent.keyDown(screen.getByRole("button", { name: mockView.name }), { key: " " });
  expect(mockReplace).toHaveBeenCalledTimes(2);
  expect(mockReplace).toHaveBeenLastCalledWith("/build/all-work?priority=urgent&view=list", { scroll: false });
});

it("keeps owner pin and delete clicks separate from applying the view", async () => {
  const user = userEvent.setup();
  mockCurrentUserId = "owner-1";
  render(<AllWorkViewsMenu activeView="list" hasActiveFilters={false} />);
  await user.click(screen.getByRole("button", { name: "Views" }));
  fireEvent.click(screen.getByRole("button", { name: `Pin ${mockView.name}` }));
  fireEvent.click(screen.getByRole("button", { name: `Delete ${mockView.name}` }));
  expect(mockUpdateView).toHaveBeenCalledWith({ viewId: mockView.id, isPinned: true }, expect.any(Object));
  expect(mockDeleteView).toHaveBeenCalledWith({ viewId: mockView.id }, expect.any(Object));
  expect(mockReplace).not.toHaveBeenCalled();
});

it("hides owner-only actions for another user while keeping the view usable", async () => {
  const user = userEvent.setup();
  render(<AllWorkViewsMenu activeView="list" hasActiveFilters={false} />);
  await user.click(screen.getByRole("button", { name: "Views" }));
  expect(screen.queryByRole("button", { name: `Pin ${mockView.name}` })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: `Delete ${mockView.name}` })).not.toBeInTheDocument();
  expect(screen.getByTitle("Personal")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: mockView.name }));
  expect(mockReplace).toHaveBeenCalledWith("/build/all-work?priority=urgent&view=list", { scroll: false });
});
