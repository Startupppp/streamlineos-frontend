import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { OrgDepartmentsPage } from "./departments-page";

const mockMutateAsync = jest.fn();
const mockRefetch = jest.fn();
const department = {
  id: "dept-9",
  orgId: "org-1",
  branchId: null,
  branchName: null,
  headUserId: null,
  name: "Operations",
  code: "OPS",
  description: null,
  status: "ACTIVE",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-18T09:00:00.123Z",
  deletedAt: null,
};

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@/components/auth/require-module", () => ({
  RequireModule: ({ children }: { children: ReactNode }) => children,
}));
jest.mock("@/components/organization/hierarchy-parent-selector", () => ({
  HierarchyParentSelector: () => null,
}));
jest.mock("@/components/ui/user-combobox", () => ({ UserCombobox: () => null }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/organization", () => ({ useOrgMembers: () => ({ data: { data: [] } }) }));
jest.mock("@/hooks/api/org-hierarchy", () => ({
  getOrgUnitDependencyPreview: jest.fn(),
  useCreateOrgDepartment: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useOrgDepartments: () => ({
    data: { data: [department], pageInfo: { limit: 100, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  }),
  useUpdateOrgDepartment: () => ({ mutateAsync: mockMutateAsync, mutate: jest.fn(), isPending: false }),
}));
jest.mock("./use-hierarchy-list-state", () => ({
  useHierarchyListState: () => ({
    page: 1,
    pageSize: 100,
    query: { limit: 100, status: "CURRENT" },
    search: "",
    serverSearch: "",
    showArchived: false,
    nextPage: jest.fn(),
    previousPage: jest.fn(),
    setPageSize: jest.fn(),
    setSearch: jest.fn(),
    setStatus: jest.fn(),
    toggleArchived: jest.fn(),
  }),
}));

const CONFLICT_MESSAGE =
  "This department was changed since you opened it. Reload to see the latest, then save again.";

describe("OrgDepartmentsPage — BE-19 a stale tab cannot overwrite a newer department edit", () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockRefetch.mockReset();
    jest.mocked(toast.error).mockReset();
    jest.mocked(toast.success).mockReset();
  });

  it("sends the updatedAt the department was opened with, and a saved edit closes the sheet", async () => {
    mockMutateAsync.mockResolvedValue(department);
    const user = userEvent.setup();
    render(<OrgDepartmentsPage />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(await screen.findByRole("button", { name: /save/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Department updated"));
    expect(mockMutateAsync.mock.calls[0][0]).toMatchObject({
      departmentId: "dept-9",
      name: "Operations",
      expectedUpdatedAt: "2026-10-18T09:00:00.123Z",
    });
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it("a stale save shows the conflict, closes the editor and reloads the departments", async () => {
    mockMutateAsync.mockRejectedValue(new ApiError(CONFLICT_MESSAGE, 409, "VERSION_CONFLICT"));
    const user = userEvent.setup();
    render(<OrgDepartmentsPage />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(await screen.findByRole("button", { name: /save/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(CONFLICT_MESSAGE));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Edit Department")).not.toBeInTheDocument());
  });
});
