import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CycleFormSheet } from "./cycle-form-sheet";
import { useCreateCycle, useUpdateCycle } from "@/hooks/api/build/advanced";
import type { Cycle } from "@/types/projects";

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

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

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
  version: 2,
  status: "completed",
  startDate: "2026-09-01",
  endDate: "2026-09-14",
  createdBy: "user-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-14T00:00:00.000Z",
};

beforeEach(() => {
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
      startDate: "2026-09-01",
      endDate: "2026-09-14",
    },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  ));
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
