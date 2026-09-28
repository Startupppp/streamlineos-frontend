import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CycleFormSheet } from "./cycle-form-sheet";
import { useCreateCycle, useUpdateCycle } from "@/hooks/api/build/advanced";
import type { Cycle } from "@/types/projects";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";
import { ApiError } from "@/lib/api-envelope";
import { toast } from "sonner";

jest.mock("@/hooks/api/build/advanced", () => ({
  useCreateCycle: jest.fn(),
  useUpdateCycle: jest.fn(),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value, onChange, id }: { value: string; onChange: (value: string) => void; id?: string }) => (
    <input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, isPending: _isPending, loadingText: _loadingText, ...props }:
    React.ButtonHTMLAttributes<HTMLButtonElement> & { isPending?: boolean; loadingText?: string }) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

let mockIsOnline = true;

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockIsOnline,
}));

jest.mock("@/features/build/ticket-details/ticket-conflict-dialog", () => ({
  TicketConflictDialog: ({ open, fields, onKeepMine, onDiscard }: {
    open: boolean;
    fields: { key: string; label: string }[];
    onKeepMine: () => void;
    onDiscard: () => void;
  }) => open ? (
    <div data-testid="conflict-dialog">
      {fields.map((f) => <span key={f.key} data-testid={`conflict-field-${f.key}`}>{f.label}</span>)}
      <button type="button" onClick={onKeepMine}>Keep mine</button>
      <button type="button" onClick={onDiscard}>Discard</button>
    </div>
  ) : null,
}));

const ITERATIONS_SCHEMAS = "src/modules/build/execution/dto/iterations.schemas.ts";

function declaredKeys(exportStatement: string): string[] {
  const source = readFileSync(backendPath(ITERATIONS_SCHEMAS), "utf8");
  const start = source.indexOf(exportStatement);
  const block = source.slice(start, source.indexOf("}).strict()", start));
  return [...block.matchAll(/^\s{4}(\w+):/gm)].map((match) => match[1]!);
}

const mockUseCreateCycle = useCreateCycle as jest.Mock;
const mockUseUpdateCycle = useUpdateCycle as jest.Mock;
const mockUpdateMutate = jest.fn();

const COMPLETED_CYCLE: Cycle = {
  id: 8,
  orgId: "org-1",
  projectId: 1,
  name: "Completed cycle",
  description: "Original goal",
  goal: null,
  capacity: null,
  version: 2,
  status: "completed",
  startDate: "2026-09-01",
  endDate: "2026-09-14",
  createdBy: "user-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-14T00:00:00.000Z",
};

beforeEach(() => {
  mockIsOnline = true;
  mockUpdateMutate.mockClear();
  mockUseCreateCycle.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateCycle.mockReturnValue({ mutate: mockUpdateMutate, isPending: false });
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

it("edits an existing completed cycle without rejecting its historical dates", async () => {
  renderWithClient(
    <CycleFormSheet
      projectId={1}
      cycles={[COMPLETED_CYCLE]}
      cycle={COMPLETED_CYCLE}
      open
      onOpenChange={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Completed cycle"));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Retrospective cycle" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledWith(
    {
      projectId: 1,
      cycleId: 8,
      version: 2,
      name: "Retrospective cycle",
      description: "Original goal",
      goal: undefined,
      capacity: null,
      startDate: "2026-09-01",
      endDate: "2026-09-14",
    },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  ));
});

it("loads the stored capacity into the form and sends the edited number back on save", async () => {
  const cycleWithCapacity: Cycle = { ...COMPLETED_CYCLE, capacity: 21 };
  renderWithClient(
    <CycleFormSheet
      projectId={1}
      cycles={[cycleWithCapacity]}
      cycle={cycleWithCapacity}
      open
      onOpenChange={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText("Capacity")).toHaveValue("21"));
  fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "34" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() =>
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity: 34 }),
      expect.any(Object),
    ),
  );
});

it("clears capacity to null rather than to zero when the field is emptied", async () => {
  const cycleWithCapacity: Cycle = { ...COMPLETED_CYCLE, capacity: 21 };
  renderWithClient(
    <CycleFormSheet
      projectId={1}
      cycles={[cycleWithCapacity]}
      cycle={cycleWithCapacity}
      open
      onOpenChange={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText("Capacity")).toHaveValue("21"));
  fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() =>
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity: null }),
      expect.any(Object),
    ),
  );
});

it("rejects a fractional capacity instead of sending a value the integer column cannot hold", async () => {
  renderWithClient(
    <CycleFormSheet
      projectId={1}
      cycles={[COMPLETED_CYCLE]}
      cycle={COMPLETED_CYCLE}
      open
      onOpenChange={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Completed cycle"));
  fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "8.5" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() => expect(screen.getByText("Capacity must be a whole number of points")).toBeInTheDocument());
  expect(mockUpdateMutate).not.toHaveBeenCalled();
});

it("offers no goal field while creating, because createCycleSchema is strict and does not declare goal", async () => {
  renderWithClient(
    <CycleFormSheet projectId={1} cycles={[]} cycle={null} open onOpenChange={jest.fn()} />,
  );

  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
  expect(screen.queryByLabelText("Goal")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Capacity")).toBeInTheDocument();
});

it("offers the goal field while editing, where updateCycleSchema does declare goal", async () => {
  renderWithClient(
    <CycleFormSheet
      projectId={1}
      cycles={[COMPLETED_CYCLE]}
      cycle={COMPLETED_CYCLE}
      open
      onOpenChange={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText("Goal")).toBeInTheDocument());
});

it("sends a create payload carrying no key createCycleSchema would reject", async () => {
  const createMutate = jest.fn();
  mockUseCreateCycle.mockReturnValue({ mutate: createMutate, isPending: false });
  renderWithClient(
    <CycleFormSheet projectId={1} cycles={[]} cycle={null} open onOpenChange={jest.fn()} />,
  );

  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Cycle 1" } });
  fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "13" } });
  const dates = screen.getAllByDisplayValue("");
  fireEvent.change(dates[dates.length - 2]!, { target: { value: "2099-01-01" } });
  fireEvent.change(dates[dates.length - 1]!, { target: { value: "2099-01-14" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Cycle" }));

  await waitFor(() => expect(createMutate).toHaveBeenCalled());
  const sent = Object.keys(createMutate.mock.calls[0]![0]).filter((key) => key !== "projectId");
  expect(backendReachable(ITERATIONS_SCHEMAS)).toBe(true);
  const declared = declaredKeys("export const createCycleSchema");
  expect(declared).toContain("name");
  expect(sent.filter((key) => !declared.includes(key))).toEqual([]);
});

it("keeps the cycle update payload inside the keys updateCycleSchema declares", async () => {
  const cycleWithCapacity: Cycle = { ...COMPLETED_CYCLE, capacity: 21, goal: "Ship the importer" };
  renderWithClient(
    <CycleFormSheet
      projectId={1}
      cycles={[cycleWithCapacity]}
      cycle={cycleWithCapacity}
      open
      onOpenChange={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Completed cycle"));
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
  const sent = Object.keys(mockUpdateMutate.mock.calls[0]![0]).filter(
    (key) => key !== "projectId" && key !== "cycleId",
  );
  const declared = declaredKeys("export const updateCycleSchema");
  expect(declared).toContain("version");
  expect(sent.filter((key) => !declared.includes(key))).toEqual([]);
  expect(sent).toContain("version");
});

it("passes version from the cycle prop to the update mutation so the server can reject stale edits", async () => {
  const cycleV5: Cycle = { ...COMPLETED_CYCLE, version: 5, name: "Sprint V5", goal: "Q4 goal" };
  renderWithClient(
    <CycleFormSheet
      projectId={1}
      cycles={[cycleV5]}
      cycle={cycleV5}
      open
      onOpenChange={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Sprint V5"));
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() =>
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ version: 5 }),
      expect.any(Object),
    ),
  );
});

it("shows a field-level conflict dialog instead of a toast when a 409 PROJECTS_TICKET_CONFLICT is returned, surfacing which fields diverged", async () => {
  const conflictError = new ApiError("Version conflict", 409, "PROJECTS_TICKET_CONFLICT", { currentVersion: 3 });
  mockUpdateMutate.mockImplementation((_payload: unknown, { onError }: { onError: (e: unknown) => void }) => {
    onError(conflictError);
  });

  renderWithClient(
    <CycleFormSheet
      projectId={1}
      cycles={[COMPLETED_CYCLE]}
      cycle={COMPLETED_CYCLE}
      open
      onOpenChange={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Completed cycle"));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Renamed cycle" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() => expect(screen.getByTestId("conflict-dialog")).toBeInTheDocument());
  expect(screen.getByTestId("conflict-field-name")).toBeInTheDocument();
});

it("sends no command while the browser is offline and keeps the typed draft in the form", async () => {
  mockIsOnline = false;
  renderWithClient(
    <CycleFormSheet
      projectId={1}
      cycles={[COMPLETED_CYCLE]}
      cycle={COMPLETED_CYCLE}
      open
      onOpenChange={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Completed cycle"));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Offline draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() =>
    expect(toast.warning).toHaveBeenCalledWith(
      "You're offline — your draft is kept here and nothing was sent.",
    ),
  );
  expect(mockUpdateMutate).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Name")).toHaveValue("Offline draft");
});

it("sends the command once the browser is online, so the offline guard is not always on", async () => {
  mockIsOnline = true;
  renderWithClient(
    <CycleFormSheet
      projectId={1}
      cycles={[COMPLETED_CYCLE]}
      cycle={COMPLETED_CYCLE}
      open
      onOpenChange={jest.fn()}
    />,
  );

  await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Completed cycle"));
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

  await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
});
