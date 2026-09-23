import { render, screen } from "@testing-library/react";
import {
  DirtyStateProvider,
  useHasUnsavedWork,
} from "@/components/shared/dirty-state-context";
import { WhiteboardPage } from "./whiteboard-page";

let mockSaveStatus: "clean" | "dirty" | "saving" | "saved" = "clean";

jest.mock("./use-whiteboard-autosave", () => ({
  useWhiteboardAutosave: () => ({
    status: mockSaveStatus,
    handleSceneChange: jest.fn(),
    manualSave: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/build", () => ({
  useWhiteboards: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
  useWhiteboard: () => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }),
  useCreateWhiteboard: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteWhiteboard: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateWhiteboard: () => ({ mutateAsync: jest.fn(), mutate: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({
    data: { isOrgOwner: true, scopes: {}, modules: {}, canManageOrganizationMembership: true, membershipId: null },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

function MockExcalidrawCanvas() {
  return <div data-testid="excalidraw-canvas" />;
}

jest.mock("next/dynamic", () => () => MockExcalidrawCanvas);

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children, className }: { children: React.ReactNode; className?: string; solid?: boolean }) => <div className={className}>{children}</div>,
  PM_FILL_PANEL: "fill-panel",
  PM_ROW: "pm-row",
}));

jest.mock("@/lib/text-overflow", () => ({ TEXT_ONE_LINE: "truncate" }));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyUploadIllustration: () => <div />,
}));

jest.mock("./create-board-dialog", () => ({
  CreateBoardDialog: () => null,
}));

jest.mock("./whiteboard-toolbar", () => ({
  WhiteboardToolbar: () => null,
}));

jest.mock("./share-dialog", () => ({
  ShareDialog: () => null,
}));

jest.mock("./scene-utils", () => ({
  computeStoredVersion: () => 0,
}));

function HasUnsavedWorkProbe() {
  const hasUnsavedWork = useHasUnsavedWork();
  return <span data-testid="probe">{hasUnsavedWork ? "dirty" : "clean"}</span>;
}

describe("whiteboard page dirty guard (BSN-04-010, BSN-04-013)", () => {
  beforeEach(() => {
    mockSaveStatus = "clean";
  });

  test("whiteboard page with clean autosave does not block scope changes", () => {
    mockSaveStatus = "clean";
    render(
      <DirtyStateProvider>
        <HasUnsavedWorkProbe />
        <WhiteboardPage projectId={1} initialBoardId={null} />
      </DirtyStateProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("clean");
  });

  test("whiteboard page registers as dirty when autosave has pending changes so scope-change guard fires", () => {
    mockSaveStatus = "dirty";
    render(
      <DirtyStateProvider>
        <HasUnsavedWorkProbe />
        <WhiteboardPage projectId={1} initialBoardId={null} />
      </DirtyStateProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("dirty");
  });

  test("whiteboard page in saving state registers as not-dirty so guard does not block while save is in flight", () => {
    mockSaveStatus = "saving";
    render(
      <DirtyStateProvider>
        <HasUnsavedWorkProbe />
        <WhiteboardPage projectId={1} initialBoardId={null} />
      </DirtyStateProvider>,
    );
    expect(screen.getByTestId("probe")).toHaveTextContent("clean");
  });
});
