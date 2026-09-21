import { render, screen } from "@testing-library/react";
import React from "react";
import { WhiteboardPage } from "./whiteboard-page";
import { DirtyStateProvider } from "@/components/shared/dirty-state-context";

jest.mock("./use-whiteboard-autosave", () => ({
  useWhiteboardAutosave: () => ({
    status: "clean",
    handleSceneChange: jest.fn(),
    manualSave: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(false),
  useAccess: jest.fn().mockReturnValue({ data: undefined, isLoading: true }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn().mockReturnValue({ data: undefined }),
}));

jest.mock("@/hooks/api/build", () => ({
  useWhiteboards: jest.fn().mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }),
  useWhiteboard: jest.fn().mockReturnValue({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() }),
  useCreateWhiteboard: jest.fn().mockReturnValue({ mutate: jest.fn(), isPending: false }),
  useDeleteWhiteboard: jest.fn().mockReturnValue({ mutate: jest.fn(), isPending: false }),
  useUpdateWhiteboard: jest.fn().mockReturnValue({ mutateAsync: jest.fn(), mutate: jest.fn() }),
}));

jest.mock("next/dynamic", () => () => null);

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  WhiteboardToolbar: () => null,
}));

jest.mock("./share-dialog", () => ({
  ShareDialog: () => null,
}));

jest.mock("./scene-utils", () => ({
  computeStoredVersion: () => 0,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, "aria-label": ariaLabel }: { children?: React.ReactNode; onClick?: () => void; "aria-label"?: string }) => (
    <button onClick={onClick} aria-label={ariaLabel}>{children}</button>
  ),
}));

describe("WhiteboardPage — access snapshot loading shows loading state (not empty state)", () => {
  it("shows loading state while access snapshot is in flight, not the create-your-first-board empty state", () => {
    render(
      <DirtyStateProvider>
        <WhiteboardPage projectId={1} initialBoardId={null} />
      </DirtyStateProvider>,
    );

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
