"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoadmapItemSheet } from "./roadmap-item-sheet";
import { useCreateRoadmapItem, useUpdateRoadmapItem } from "@/hooks/api/build/roadmap";

jest.mock("@/hooks/api/build/roadmap", () => ({
  useCreateRoadmapItem: jest.fn(),
  useUpdateRoadmapItem: jest.fn(),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));

jest.mock("@/lib/query-keys/knowledge-and-surveys", () => ({
  knowledgeAndSurveysQueryKeys: {
    roadmap: {
      items: jest.fn(() => ["roadmap", "items"]),
    },
  },
}));

jest.mock("@/features/build/ticket-details/ticket-conflict-dialog", () => ({
  TicketConflictDialog: ({
    open,
    fields,
  }: {
    open: boolean;
    fields: Array<{ key: string; label: string; serverValue: string; pendingValue: string }>;
    onKeepMine: () => void;
    onDiscard: () => void;
  }) =>
    open ? (
      <div data-testid="conflict-dialog">
        {fields.map((f) => (
          <div key={f.key} data-testid={`conflict-field-${f.key}`}>
            <span data-testid={`server-${f.key}`}>{f.serverValue}</span>
            <span data-testid={`pending-${f.key}`}>{f.pendingValue}</span>
          </div>
        ))}
      </div>
    ) : null,
}));

jest.mock("./roadmap-delivery-progress", () => ({
  RoadmapDeliveryProgress: () => null,
}));

jest.mock("./roadmap-rice-form-fields", () => ({
  RoadmapRiceFormFields: () => null,
}));

jest.mock("./roadmap-constants", () => ({
  ROADMAP_STATUS_OPTIONS: [
    { value: "planned", label: "Planned" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ],
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/lib/api-client", () => ({
  isApiError: (e: unknown): e is { status: number; code?: string; details?: unknown } =>
    typeof e === "object" && e !== null && "status" in e,
  getApiErrorCode: (e: { code?: string }) => e.code ?? null,
}));

const mockUseUpdateRoadmapItem = useUpdateRoadmapItem as jest.Mock;
const mockUseCreateRoadmapItem = useCreateRoadmapItem as jest.Mock;

const BASELINE_ITEM = {
  id: 1,
  orgId: "org-1",
  title: "Original title",
  description: null,
  status: "planned" as const,
  category: null,
  isPublic: true,
  projectId: null,
  epicTicketId: null,
  targetQuarter: null,
  sortOrder: 0,
  votes: 0,
  reach: null,
  impact: null,
  confidence: null,
  effort: null,
  version: 3,
  createdBy: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  deletedAt: null,
  prioritization: { method: "rice" as const, score: null, isComplete: false, missingInputs: [], unavailableReason: null },
  tierWeighting: { tierWeighted: false, tier: null, weight: null, weightedScore: null, unweightedReason: "score_unavailable" as const, linkedFeedbackCount: 0, linkedAccountCount: 0, linkedRevenue: null, revenueKnownAccountCount: 0 },
};

describe("RoadmapItemSheet — 409 conflict surfaces a field-level diff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCreateRoadmapItem.mockReturnValue({ mutate: jest.fn(), isPending: false });
  });

  it("opens the conflict dialog with field-level diffs when update returns PROJECTS_TICKET_CONFLICT — positive: conflict dialog present", async () => {
    let capturedOnError: ((e: unknown) => void) | undefined;
    mockUseUpdateRoadmapItem.mockReturnValue({
      mutate: jest.fn((_vars: unknown, opts: { onError?: (e: unknown) => void }) => {
        capturedOnError = opts.onError;
      }),
      isPending: false,
    });

    render(<RoadmapItemSheet item={BASELINE_ITEM} onClose={jest.fn()} />);

    const titleInput = screen.getByPlaceholderText("e.g. Dark mode support");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "New title");

    const saveButton = screen.getByText("Save Changes");
    await userEvent.click(saveButton);

    capturedOnError?.({
      status: 409,
      code: "PROJECTS_TICKET_CONFLICT",
      details: { currentVersion: 4 },
    });

    await waitFor(() => {
      expect(screen.getByTestId("conflict-dialog")).toBeInTheDocument();
    });
  });

  it("shows the changed title field in the conflict diff — the diff entry carries both server and pending values", async () => {
    let capturedOnError: ((e: unknown) => void) | undefined;
    mockUseUpdateRoadmapItem.mockReturnValue({
      mutate: jest.fn((_vars: unknown, opts: { onError?: (e: unknown) => void }) => {
        capturedOnError = opts.onError;
      }),
      isPending: false,
    });

    render(<RoadmapItemSheet item={BASELINE_ITEM} onClose={jest.fn()} />);

    const titleInput = screen.getByPlaceholderText("e.g. Dark mode support");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "New title");

    const saveButton = screen.getByText("Save Changes");
    await userEvent.click(saveButton);

    capturedOnError?.({
      status: 409,
      code: "PROJECTS_TICKET_CONFLICT",
      details: { currentVersion: 4 },
    });

    await waitFor(() => {
      expect(screen.getByTestId("conflict-field-title")).toBeInTheDocument();
    });
    expect(screen.getByTestId("server-title").textContent).toBe("Original title");
    expect(screen.getByTestId("pending-title").textContent).toBe("New title");
  });

  it("does not open the conflict dialog when no fields differ from the baseline — negative: conflict dialog absent", async () => {
    let capturedOnError: ((e: unknown) => void) | undefined;
    mockUseUpdateRoadmapItem.mockReturnValue({
      mutate: jest.fn((_vars: unknown, opts: { onError?: (e: unknown) => void }) => {
        capturedOnError = opts.onError;
      }),
      isPending: false,
    });

    render(<RoadmapItemSheet item={BASELINE_ITEM} onClose={jest.fn()} />);

    const saveButton = screen.getByText("Save Changes");
    await userEvent.click(saveButton);

    capturedOnError?.({
      status: 409,
      code: "PROJECTS_TICKET_CONFLICT",
      details: { currentVersion: 4 },
    });

    await waitFor(() => {
      expect(screen.queryByTestId("conflict-dialog")).not.toBeInTheDocument();
    });
  });
});

describe("RoadmapItemSheet — product association", () => {
  it("submits the product ID so a new item appears in the product-scoped list", async () => {
    const mutate = jest.fn();
    mockUseCreateRoadmapItem.mockReturnValue({ mutate, isPending: false });
    mockUseUpdateRoadmapItem.mockReturnValue({ mutate: jest.fn(), isPending: false });

    render(<RoadmapItemSheet managedProductId={39} onClose={jest.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("e.g. Dark mode support"), "Product initiative");
    await userEvent.click(screen.getByText("Create Item"));

    await waitFor(() => expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Product initiative", managedProductId: 39 }),
      expect.any(Object),
    ));
  });
});
