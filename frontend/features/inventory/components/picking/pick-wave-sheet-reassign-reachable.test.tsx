import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { PickWaveSheet } from "./pick-wave-sheet";

/**
 * The reassign endpoint exists, is permissioned and is fenced. What it did not
 * have was a caller: `useReassignPickWave` was referenced by no component, page
 * or test, so a supervisor could not move a claimed wave off a picker who had
 * gone home. A unit test of the control alone would not have caught that — the
 * control passed its own tests while nothing mounted it.
 *
 * This renders the sheet a supervisor actually opens and asserts the control is
 * in it, which is the claim that was false before.
 */

const mockDetail = {
  id: 44,
  pickNumber: "PW-0044",
  status: "IN_PROGRESS" as const,
  soId: null,
  warehouseId: 7,
  assignedTo: "picker-a",
  claimedAt: "2026-09-09T09:00:00.000Z",
  createdAt: "2026-09-09T08:00:00.000Z",
  lines: [],
};

const idleMutation = { mutate: jest.fn(), isPending: false };

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/inventory/picking", () => ({
  ...jest.requireActual("@/hooks/api/inventory/picking"),
  usePickWave: () => ({
    data: mockDetail,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useClaimPickWave: () => idleMutation,
  useAbandonPickWave: () => idleMutation,
  useReassignPickWave: () => idleMutation,
  useReportPickException: () => idleMutation,
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  ...jest.requireActual("@/hooks/api/inventory/warehouses"),
  useWarehouseAssignees: () => ({
    data: {
      items: [
        {
          userId: "picker-b",
          name: "Bhavna Iyer",
          firstName: null,
          lastName: null,
          email: "bhavna@example.test",
          image: null,
          grantedBy: "supervisor",
          grantedByName: "Supervisor",
          grantedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/inventory/scan", () => ({
  ...jest.requireActual("@/hooks/api/inventory/scan"),
  useCaptureScan: () => idleMutation,
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
  useOrgMembersByIds: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/build/projects", () => ({
  useProjectMembers: () => ({ data: [] }),
}));
jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/module-access", () => ({
  useModuleMemberCandidates: () => ({ data: undefined }),
}));

it("puts the reassign control on the wave a supervisor opens", () => {
  renderWithProviders(
    <PickWaveSheet
      open
      onOpenChange={jest.fn()}
      pickListId={44}
      currentUserId="supervisor"
      canPick
    />,
  );

  expect(screen.getByRole("button", { name: /hand to someone else/i })).toBeInTheDocument();
});
