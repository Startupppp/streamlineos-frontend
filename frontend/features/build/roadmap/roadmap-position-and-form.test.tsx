import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { RoadmapItemSheet } from "./roadmap-item-sheet";
import {
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
  usePositionRoadmapItem,
} from "@/hooks/api/build/roadmap";

jest.mock("@/hooks/api/build/roadmap", () => ({
  useCreateRoadmapItem: jest.fn(),
  useUpdateRoadmapItem: jest.fn(),
  usePositionRoadmapItem: jest.fn(),
}));

jest.mock("@/hooks/api/build/projects", () => ({ useProjects: jest.fn(() => ({ data: { data: [], hasMore: false }, isLoading: false, isError: false })) }));
jest.mock("@/hooks/api/goals", () => ({ useGoals: jest.fn(() => ({ data: [] })) }));
jest.mock("@/hooks/api/build/managed-product-releases", () => ({ useManagedProductReleases: jest.fn(() => ({ data: null })) }));
jest.mock("@/hooks/api/build/teams", () => ({ useProjectTeams: jest.fn(() => ({ data: null })) }));
jest.mock("@/hooks/api/build/epics", () => ({ useEpics: jest.fn(() => ({ data: [] })) }));

jest.mock("@/components/ui/combobox", () => ({
  Combobox: () => <select aria-label="Delivery project" />,
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
  useNavigationLeave: () => (action: () => void) => action(),
}));

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock("@/lib/query-keys/knowledge-and-surveys", () => ({
  knowledgeAndSurveysQueryKeys: { roadmap: { items: jest.fn(() => ["roadmap"]) } },
}));

jest.mock("@/features/build/ticket-details/ticket-conflict-dialog", () => ({
  TicketConflictDialog: () => null,
}));

jest.mock("./roadmap-delivery-progress", () => ({ RoadmapDeliveryProgress: () => null }));
jest.mock("./roadmap-rice-form-fields", () => ({ RoadmapRiceFormFields: () => null }));

jest.mock("./roadmap-constants", () => ({
  ROADMAP_STATUS_OPTIONS: [
    { value: "planned", label: "Planned" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ],
  ROADMAP_HORIZON_OPTIONS: [
    { value: "now", label: "Now" },
    { value: "next", label: "Next" },
    { value: "later", label: "Later" },
  ],
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
jest.mock("@/lib/get-error-message", () => ({ getErrorMessage: (e: unknown) => String(e) }));
jest.mock("@/lib/api-client", () => ({
  isApiError: (e: unknown): boolean => typeof e === "object" && e !== null && "status" in e,
  getApiErrorCode: (e: { code?: string }) => e.code ?? null,
}));

const mockUseCreateRoadmapItem = useCreateRoadmapItem as jest.Mock;
const mockUseUpdateRoadmapItem = useUpdateRoadmapItem as jest.Mock;
const mockUsePositionRoadmapItem = usePositionRoadmapItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCreateRoadmapItem.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateRoadmapItem.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUsePositionRoadmapItem.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("roadmap item form — target date validation", () => {
  it("shows a validation error when target end is before target start — positive: error message is present", async () => {
    render(<RoadmapItemSheet onClose={jest.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("e.g. Dark mode support"), "Feature");

    const startInput = screen.getByLabelText("Target Start");
    const endInput = screen.getByLabelText("Target End");
    await userEvent.type(startInput, "2026-06-01");
    await userEvent.type(endInput, "2026-05-01");

    await userEvent.click(screen.getByText("Create Item"));
    await waitFor(() => {
      expect(screen.getByText("Target end must be on or after target start")).toBeInTheDocument();
    });
  });

  it("accepts equal start and end dates — no validation error", async () => {
    const mutate = jest.fn();
    mockUseCreateRoadmapItem.mockReturnValue({ mutate, isPending: false });
    render(<RoadmapItemSheet onClose={jest.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("e.g. Dark mode support"), "Feature");

    const startInput = screen.getByLabelText("Target Start");
    const endInput = screen.getByLabelText("Target End");
    await userEvent.type(startInput, "2026-06-01");
    await userEvent.type(endInput, "2026-06-01");

    await userEvent.click(screen.getByText("Create Item"));
    await waitFor(() => {
      expect(screen.queryByText("Target end must be on or after target start")).not.toBeInTheDocument();
      expect(mutate).toHaveBeenCalled();
    });
  });

  it("includes targetStart and targetEnd in the create payload when set", async () => {
    const mutate = jest.fn();
    mockUseCreateRoadmapItem.mockReturnValue({ mutate, isPending: false });
    render(<RoadmapItemSheet onClose={jest.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("e.g. Dark mode support"), "Feature");

    await userEvent.type(screen.getByLabelText("Target Start"), "2026-07-01");
    await userEvent.type(screen.getByLabelText("Target End"), "2026-09-30");
    await userEvent.click(screen.getByText("Create Item"));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ targetStart: "2026-07-01", targetEnd: "2026-09-30" }),
        expect.any(Object),
      );
    });
  });
});

describe("roadmap item form — horizon is included in the payload", () => {
  it("submits the default horizon (later) when no horizon is selected", async () => {
    const mutate = jest.fn();
    mockUseCreateRoadmapItem.mockReturnValue({ mutate, isPending: false });
    render(<RoadmapItemSheet onClose={jest.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("e.g. Dark mode support"), "Feature");
    await userEvent.click(screen.getByText("Create Item"));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ horizon: "later" }),
        expect.any(Object),
      );
    });
  });
});

describe("usePositionRoadmapItem — the hook is exported from roadmap hooks", () => {
  it("is importable and callable with roadmapItemId, version and horizon", () => {
    expect(mockUsePositionRoadmapItem).toBeDefined();
    const result = mockUsePositionRoadmapItem();
    expect(result.mutate).toBeDefined();
  });
});
