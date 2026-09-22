import { render } from "@testing-library/react";
import React from "react";
import { WhiteboardPage } from "./whiteboard-page";
import { DirtyStateProvider } from "@/components/shared/dirty-state-context";

function MockExcalidrawCanvas() {
  return <div data-testid="excalidraw-canvas" />;
}

let capturedShareToken: string | null | undefined = undefined;
let capturedKeepOpenOnConfirm: boolean | undefined = undefined;
let capturedIsPending: boolean | undefined = undefined;
let mockDeleteIsPending = true;

jest.mock("./use-whiteboard-autosave", () => ({
  useWhiteboardAutosave: () => ({
    status: "clean",
    handleSceneChange: jest.fn(),
    manualSave: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({
    data: {
      isOrgOwner: true,
      scopes: {},
      modules: {},
      canManageOrganizationMembership: true,
      membershipId: null,
    },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build", () => ({
  useWhiteboards: () => ({
    data: [
      {
        id: 1,
        name: "Test Board",
        elementCount: 0,
        visibility: "project",
        createdBy: null,
        updatedAt: null,
      },
    ],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  }),
  useWhiteboard: () => ({
    data: {
      id: 1,
      projectId: 1,
      name: "Test Board",
      data: { elements: [] },
      visibility: "project",
      access: "manage",
      sharing: {
        visibility: "project",
        publicAccess: "viewer",
        shareToken: "abc123",
        linkExpiresAt: null,
        allowExport: false,
      },
      shares: [],
      createdBy: null,
      createdAt: null,
      updatedAt: null,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useCreateWhiteboard: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteWhiteboard: () => ({ mutate: jest.fn(), isPending: mockDeleteIsPending }),
  useUpdateWhiteboard: () => ({ mutateAsync: jest.fn(), mutate: jest.fn() }),
}));

jest.mock("next/dynamic", () => () => MockExcalidrawCanvas);

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode; className?: string; solid?: boolean }) => <div>{children}</div>,
  PM_FILL_PANEL: "fill-panel",
  PM_ROW: "pm-row",
}));

jest.mock("@/lib/text-overflow", () => ({ TEXT_ONE_LINE: "truncate" }));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/shared/loading-state", () => ({
  LoadingState: () => <div data-testid="loading-state" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution }: { resolution: { kind: string } }) => (
    <div data-testid={`page-state-${resolution.kind}`} />
  ),
}));

jest.mock("@/components/illustrations", () => ({
  EmptyUploadIllustration: () => <div />,
}));

jest.mock("./create-board-dialog", () => ({
  CreateBoardDialog: () => null,
}));

jest.mock("./whiteboard-toolbar", () => ({
  WhiteboardToolbar: ({ shareToken }: { shareToken: string | null }) => {
    capturedShareToken = shareToken;
    return <div data-testid="whiteboard-toolbar" />;
  },
}));

jest.mock("./share-dialog", () => ({
  ShareDialog: () => null,
}));

jest.mock("./scene-utils", () => ({
  computeStoredVersion: () => 0,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    actions,
  }: {
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="page-actions">{actions}</div>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    keepOpenOnConfirm,
    isPending,
  }: {
    keepOpenOnConfirm?: boolean;
    isPending?: boolean;
  }) => {
    capturedKeepOpenOnConfirm = keepOpenOnConfirm;
    capturedIsPending = isPending;
    return <div data-testid="confirm-dialog" />;
  },
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    "aria-label"?: string;
  }) => (
    <button onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

function renderPage() {
  return render(
    <DirtyStateProvider>
      <WhiteboardPage projectId={1} initialBoardId={1} />
    </DirtyStateProvider>,
  );
}

describe("WhiteboardPage — H1 public link disclosure", () => {
  beforeEach(() => {
    capturedShareToken = undefined;
    mockDeleteIsPending = true;
  });

  it("passes null shareToken to toolbar when sharing.visibility is project (not public) so Open public link button is hidden even when a token exists", () => {
    renderPage();
    expect(capturedShareToken).toBeNull();
  });
});

describe("WhiteboardPage — H4 delete dialog stays open on failure", () => {
  beforeEach(() => {
    capturedKeepOpenOnConfirm = undefined;
    capturedIsPending = undefined;
    mockDeleteIsPending = true;
  });

  it("passes keepOpenOnConfirm to delete ConfirmDialog so a failed delete does not auto-dismiss the dialog", () => {
    renderPage();
    expect(capturedKeepOpenOnConfirm).toBe(true);
  });

  it("passes isPending from deleteBoard mutation so the confirm button is disabled while deleting", () => {
    renderPage();
    expect(capturedIsPending).toBe(true);
  });
});
