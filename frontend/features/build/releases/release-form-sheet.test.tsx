import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReleaseFormSheet } from "./release-form-sheet";
import { useCreateRelease, useUpdateRelease } from "@/hooks/api/build/releases";
import type { Release } from "@/types/projects";

jest.mock("@/hooks/api/build/releases", () => ({
  releaseBaseKey: (id: number) => ["projects", id, "releases"],
  useCreateRelease: jest.fn(),
  useUpdateRelease: jest.fn(),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    isPending: _isPending,
    loadingText: _loadingText,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isPending?: boolean;
    loadingText?: string;
  }) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    children,
    onValueChange,
  }: {
    value?: string;
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
  }) => (
    <select value={value ?? ""} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectValue: () => null,
}));

jest.mock("@/components/ui/form", () => {
  const actual = jest.requireActual<typeof import("@/components/ui/form")>("@/components/ui/form");
  return {
    ...actual,
    FormControl: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <input
      type="date"
      data-testid="date-picker"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

jest.mock("next/dynamic", () => {
  function MockEditor() {
    return <textarea data-testid="tiptap-editor" />;
  }
  const dynamic = () => MockEditor;
  dynamic.default = dynamic;
  return dynamic;
});

jest.mock("@/features/build/ticket-details/ticket-conflict-dialog", () => ({
  TicketConflictDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="conflict-dialog" /> : null,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

let capturedConfirmOpen = false;
let capturedOnConfirm: (() => void) | null = null;
let capturedOnOpenChange: ((open: boolean) => void) | null = null;

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  }) => {
    capturedConfirmOpen = open;
    capturedOnConfirm = onConfirm;
    capturedOnOpenChange = onOpenChange;
    if (!open) return null;
    return (
      <div data-testid="publish-confirm-dialog">
        <button type="button" data-testid="confirm-publish" onClick={onConfirm}>
          Publish
        </button>
        <button type="button" data-testid="cancel-publish" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
      </div>
    );
  },
}));

const mockUpdateMutate = jest.fn();
const mockCreateMutate = jest.fn();

const DRAFT_RELEASE: Release = {
  id: 7,
  projectId: 1,
  name: "v2.0.0",
  version: "2.0.0",
  status: "draft",
  rowVersion: 3,
  description: null,
  releaseDate: null,
  publishedAt: null,
  readiness: null,
  riskLevel: null,
  ticketCount: 0,
  createdBy: null,
  createdByUser: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

const RELEASED_RELEASE: Release = {
  ...DRAFT_RELEASE,
  id: 8,
  status: "released",
  publishedAt: "2026-10-01T00:00:00Z",
};

beforeEach(() => {
  capturedConfirmOpen = false;
  capturedOnConfirm = null;
  capturedOnOpenChange = null;
  mockUpdateMutate.mockClear();
  mockCreateMutate.mockClear();
  (useUpdateRelease as jest.Mock).mockReturnValue({ mutate: mockUpdateMutate, isPending: false });
  (useCreateRelease as jest.Mock).mockReturnValue({ mutate: mockCreateMutate, isPending: false });
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

it("shows the publish confirm dialog and does NOT call mutate when editing a draft release and submitting with status released", async () => {
  renderWithClient(
    <ReleaseFormSheet projectId={1} release={DRAFT_RELEASE} onClose={jest.fn()} />,
  );

  await waitFor(() => expect(screen.getByDisplayValue("Draft")).toBeInTheDocument());

  fireEvent.change(screen.getByDisplayValue("Draft"), { target: { value: "released" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() =>
    expect(screen.getByTestId("publish-confirm-dialog")).toBeInTheDocument(),
  );
  expect(mockUpdateMutate).not.toHaveBeenCalled();
});

it("calls mutate with previewConfirmed: true after the user confirms the publish dialog", async () => {
  renderWithClient(
    <ReleaseFormSheet projectId={1} release={DRAFT_RELEASE} onClose={jest.fn()} />,
  );

  await waitFor(() => expect(screen.getByDisplayValue("Draft")).toBeInTheDocument());

  fireEvent.change(screen.getByDisplayValue("Draft"), { target: { value: "released" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() =>
    expect(screen.getByTestId("publish-confirm-dialog")).toBeInTheDocument(),
  );

  fireEvent.click(screen.getByTestId("confirm-publish"));

  expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
  expect(mockUpdateMutate).toHaveBeenCalledWith(
    expect.objectContaining({
      releaseId: DRAFT_RELEASE.id,
      rowVersion: DRAFT_RELEASE.rowVersion,
      status: "released",
      previewConfirmed: true,
    }),
    expect.any(Object),
  );
});

it("does NOT call mutate after the user cancels the publish confirm dialog", async () => {
  renderWithClient(
    <ReleaseFormSheet projectId={1} release={DRAFT_RELEASE} onClose={jest.fn()} />,
  );

  await waitFor(() => expect(screen.getByDisplayValue("Draft")).toBeInTheDocument());

  fireEvent.change(screen.getByDisplayValue("Draft"), { target: { value: "released" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() =>
    expect(screen.getByTestId("publish-confirm-dialog")).toBeInTheDocument(),
  );

  fireEvent.click(screen.getByTestId("cancel-publish"));

  await waitFor(() =>
    expect(screen.queryByTestId("publish-confirm-dialog")).not.toBeInTheDocument(),
  );
  expect(mockUpdateMutate).not.toHaveBeenCalled();
});

it("calls mutate directly without a confirm dialog when updating an already-released release", async () => {
  renderWithClient(
    <ReleaseFormSheet projectId={1} release={RELEASED_RELEASE} onClose={jest.fn()} />,
  );

  await waitFor(() => expect(screen.getByDisplayValue("Released")).toBeInTheDocument());

  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1));
  expect(screen.queryByTestId("publish-confirm-dialog")).not.toBeInTheDocument();
  expect(mockUpdateMutate).toHaveBeenCalledWith(
    expect.not.objectContaining({ previewConfirmed: true }),
    expect.any(Object),
  );
});
