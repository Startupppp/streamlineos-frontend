import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { NurtureStep } from "@/types/crm/nurture";
import { NurtureStepEditor } from "./nurture-step-editor";

const mockReplace = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("@/hooks/api/crm/nurture", () => ({
  useReplaceNurtureSteps: () => mockReplace(),
}));
jest.mock("sonner", () => ({
  toast: { success: (m: string) => mockToastSuccess(m), error: (m: string) => mockToastError(m) },
}));

const step = (stepNumber: number, waitHours: number): NurtureStep => ({
  nurtureStepId: `s-${stepNumber}`,
  stepNumber,
  waitHours,
});

function mutate(impl?: (vars: unknown, opts: { onSuccess?: (data: NurtureStep[]) => void; onError?: (e: Error) => void }) => void) {
  const fn = jest.fn(impl ?? (() => undefined));
  mockReplace.mockReturnValue({ mutate: fn, isPending: false });
  return fn;
}

function renderEditor(
  over: Partial<React.ComponentProps<typeof NurtureStepEditor>> = {},
) {
  return render(
    <NurtureStepEditor
      nurtureSequenceId="seq-1"
      steps={[step(1, 240), step(2, 480)]}
      status="draft"
      canManage
      {...over}
    />,
  );
}

function waitField(index: number): HTMLInputElement {
  return screen.getByLabelText(`Step ${index} wait in hours`);
}

describe("NurtureStepEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutate();
  });

  it("seeds one field per stored step, in step order", () => {
    renderEditor({ steps: [step(2, 480), step(1, 240)] });
    expect(waitField(1)).toHaveValue("240");
    expect(waitField(2)).toHaveValue("480");
  });

  it("says when each step comes due, counted from enrolling", () => {
    renderEditor();
    expect(screen.getByText("Due 10 days after enrolling.")).toBeInTheDocument();
    expect(screen.getByText("Due 30 days after enrolling.")).toBeInTheDocument();
  });

  /**
   * The clamp is the reason this is an editor and not a number field. A cadence
   * typed at two days is stored at ten, and a screen that hid that would leave
   * somebody believing they configured a sequence they did not.
   */
  it("shows what a too-tight wait will actually run at, and why", () => {
    renderEditor();
    fireEvent.change(waitField(1), { target: { value: "48" } });

    const notice = screen.getByText(/Runs at 10 days/);
    expect(notice).toBeInTheDocument();
    expect(notice.textContent).toContain("never sent");
  });

  it("re-counts the schedule from the clamped wait, not the typed one", () => {
    renderEditor();
    fireEvent.change(waitField(1), { target: { value: "1" } });
    // Step 1 runs at the 240-hour floor, so step 2 still lands at 240 + 480.
    expect(screen.getByText("Due 10 days after enrolling.")).toBeInTheDocument();
    expect(screen.getByText("Due 30 days after enrolling.")).toBeInTheDocument();
  });

  it("says nothing about a clamp when the wait is one the sender will keep", () => {
    renderEditor();
    expect(screen.queryByText(/Runs at/)).not.toBeInTheDocument();
  });

  it("adds a step at the floor rather than at zero", () => {
    renderEditor({ steps: [step(1, 240)] });
    fireEvent.click(screen.getByRole("button", { name: /add step/i }));
    expect(waitField(2)).toHaveValue("240");
  });

  it("stops adding at the twelve-step limit and says why", () => {
    const twelve = Array.from({ length: 12 }, (_, index) => step(index + 1, 240));
    renderEditor({ steps: twelve });

    expect(screen.getByRole("button", { name: /add step/i })).toBeDisabled();
    expect(screen.getByText(/12 steps is the limit/)).toBeInTheDocument();
  });

  it("removes a step", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Remove step 2" }));
    expect(screen.queryByLabelText("Step 2 wait in hours")).not.toBeInTheDocument();
  });

  it("will not save until something has changed", () => {
    renderEditor();
    expect(screen.getByRole("button", { name: /save cadence/i })).toBeDisabled();
  });

  it("sends the waits as numbers, with no step numbers", async () => {
    const send = mutate();
    renderEditor({ steps: [step(1, 240)] });

    fireEvent.change(waitField(1), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: /save cadence/i }));

    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(send.mock.calls[0]?.[0]).toEqual({
      nurtureSequenceId: "seq-1",
      steps: [{ waitHours: 300 }],
    });
  });

  /** The server answers with what it stored, clamped — so the fields show the clamp. */
  it("resets the fields from the server's clamped answer", async () => {
    const send = mutate((_vars, opts) => opts.onSuccess?.([step(1, 240)]));
    renderEditor({ steps: [step(1, 300)] });

    fireEvent.change(waitField(1), { target: { value: "48" } });
    fireEvent.click(screen.getByRole("button", { name: /save cadence/i }));

    await waitFor(() => expect(send).toHaveBeenCalled());
    await waitFor(() => expect(waitField(1)).toHaveValue("240"));
    expect(mockToastSuccess).toHaveBeenCalledWith("Cadence saved");
  });

  it("refuses to send a wait the wire would reject, and says which field", async () => {
    const send = mutate();
    renderEditor({ steps: [step(1, 240)] });

    fireEvent.change(waitField(1), { target: { value: "12.5" } });
    fireEvent.click(screen.getByRole("button", { name: /save cadence/i }));

    await waitFor(() =>
      expect(screen.getByText("Whole hours only — no decimals, no minus sign")).toBeInTheDocument(),
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a wait past ninety days", async () => {
    const send = mutate();
    renderEditor({ steps: [step(1, 240)] });

    fireEvent.change(waitField(1), { target: { value: "2161" } });
    fireEvent.click(screen.getByRole("button", { name: /save cadence/i }));

    await waitFor(() => expect(screen.getByText(/at most 2160 hours/)).toBeInTheDocument());
    expect(send).not.toHaveBeenCalled();
  });

  it("reports a failed save through the shared error message", async () => {
    mutate((_vars, opts) => opts.onError?.(new Error("Steps must be numbered from 1 with no gaps")));
    renderEditor({ steps: [step(1, 240)] });

    fireEvent.change(waitField(1), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: /save cadence/i }));

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Steps must be numbered from 1 with no gaps"),
    );
  });

  /**
   * An empty cadence is savable — it is how steps are cleared — so the warning
   * has to carry the consequence instead of the field refusing it.
   */
  it("warns that an empty cadence cannot be activated", () => {
    renderEditor({ steps: [] });
    expect(screen.getByText("This sequence has no steps")).toBeInTheDocument();
    expect(screen.getByText(/cannot be activated/)).toBeInTheDocument();
  });

  it("warns harder when the running sequence has been emptied", () => {
    renderEditor({ steps: [], status: "active" });
    expect(screen.getByText(/every enrolment in it ends at its first wake/)).toBeInTheDocument();
  });

  it("offers no way to change anything without the manage key", () => {
    renderEditor({ canManage: false });

    expect(screen.queryByRole("button", { name: /add step/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save cadence/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove step/i })).not.toBeInTheDocument();
    expect(waitField(1)).toBeDisabled();
  });
});
