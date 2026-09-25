import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReportingLineView } from "@/hooks/api/hr/reporting-lines-schema";
import { ApiError } from "@/lib/api-envelope";
import { ReportingLineSection } from "./reporting-line-section";
import { editorPayload, exceedsChangeThreshold, reportingLineEditorSchema, editorDefaults } from "./reporting-line-editor-schema";

const can = jest.fn();
const setLine = jest.fn();
const confirmFallback = jest.fn();
let line: ReportingLineView;

jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => can(key) }));
jest.mock("@/hooks/api/hr/reporting-lines", () => ({
  useReportingLine: () => ({ data: line, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useSetReportingLine: () => ({ mutate: setLine, isPending: false }),
  useConfirmReportingFallback: () => ({ mutate: confirmFallback, isPending: false }),
}));
jest.mock("@/components/hr/reporting-lines/manager-candidate-picker", () => ({
  ManagerCandidatePicker: ({ id, onChange, disabled }: { id?: string; onChange: (id: string, ref: unknown) => void; disabled?: boolean }) => (
    <button
      type="button"
      id={id}
      role="combobox"
      disabled={disabled}
      onClick={() => onChange("u-new", { userId: "u-new", name: "Nia New", email: null, designation: null, state: "active" })}
    >
      pick
    </button>
  ),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

function makeLine(overrides: Partial<ReportingLineView> = {}): ReportingLineView {
  return {
    userId: "u-emp",
    current: {
      lineId: 1,
      managerUserId: "u-dana",
      managerName: "Dana Default",
      managerEmail: null,
      managerDesignation: "HR Lead",
      effectiveFrom: "2026-09-01",
      effectiveTo: null,
      recordedAt: "2026-09-01T00:00:00Z",
      recordedBy: null,
      managerState: "active",
      source: "ONBOARDING_FALLBACK",
      isFallback: true,
      relationshipType: "PRIMARY",
      fallbackConfirmedAt: null,
      changeReason: null,
    },
    upcoming: [],
    history: [],
    secondary: [],
    topLevel: null,
    primaryChangesLast24h: 0,
    changeThreshold: 3,
    maxSecondaryManagers: 1,
    pendingRequest: null,
    permittedActions: { manage: true, review: false, override: false },
    ...overrides,
  };
}

beforeEach(() => {
  line = makeLine();
  can.mockReset().mockReturnValue(false);
  setLine.mockReset();
  confirmFallback.mockReset();
});

describe("Reporting line card", () => {
  it("marks an unconfirmed fallback, without actions for a viewer who cannot manage", () => {
    render(<ReportingLineSection employeeId="u-emp" />);
    expect(screen.getByText("Temporarily assigned by onboarding policy")).toBeInTheDocument();
    expect(screen.getByText(/Assigned by onboarding policy/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Keep as manager" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("offers one-click keep and replace to a manager of reporting lines", async () => {
    can.mockImplementation((key: string) => key === "hr:reporting-lines:manage");
    render(<ReportingLineSection employeeId="u-emp" />);
    await userEvent.click(screen.getByRole("button", { name: "Keep as manager" }));
    expect(confirmFallback).toHaveBeenCalledWith("u-emp", expect.any(Object));
    await userEvent.click(screen.getByRole("button", { name: "Replace manager" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Edit reporting line");
  });

  it("drops the fallback badge once confirmed", () => {
    line = makeLine({ current: { ...makeLine().current!, fallbackConfirmedAt: "2026-09-02T00:00:00Z" } });
    render(<ReportingLineSection employeeId="u-emp" />);
    expect(screen.queryByText("Temporarily assigned by onboarding policy")).not.toBeInTheDocument();
  });

  it("labels additional managers and a top-level role", () => {
    line = makeLine({
      current: null,
      topLevel: { reason: "Founder", effectiveFrom: "2026-01-01" },
      secondary: [],
    });
    render(<ReportingLineSection employeeId="u-emp" />);
    expect(screen.getByText("Top-level role")).toBeInTheDocument();
    expect(screen.getByText("Founder")).toBeInTheDocument();
  });
});

describe("Reporting line editor — change-warning UI (PRD D4)", () => {
  async function openEditor() {
    can.mockImplementation((key: string) => key === "hr:reporting-lines:manage");
    render(<ReportingLineSection employeeId="u-emp" />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  }

  it("shows no warning under the threshold", async () => {
    line = makeLine({ primaryChangesLast24h: 2 });
    await openEditor();
    await userEvent.click(screen.getByRole("combobox", { name: "Primary reporting manager" }));
    expect(screen.queryByText(/changed .* in the last 24 hours/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("warns past the threshold and blocks saving without elevated authority", async () => {
    line = makeLine({ primaryChangesLast24h: 3 });
    await openEditor();
    await userEvent.click(screen.getByRole("combobox", { name: "Primary reporting manager" }));
    expect(screen.getByRole("status")).toHaveTextContent("changed 3 times in the last 24 hours (limit 3)");
    expect(screen.getByRole("status")).toHaveTextContent("Ask one to make this change.");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("lets an admin save past the threshold only with a 10-character reason", async () => {
    line = makeLine({ primaryChangesLast24h: 3, permittedActions: { manage: true, review: true, override: true } });
    await openEditor();
    await userEvent.click(screen.getByRole("combobox", { name: "Primary reporting manager" }));
    expect(screen.getByLabelText("Emergency change")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Give a reason of at least 10 characters.")).toBeInTheDocument();
    expect(setLine).not.toHaveBeenCalled();

    await userEvent.type(screen.getByRole("textbox", { name: /Reason/ }), "Team reorganisation");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(setLine).toHaveBeenCalled());
    expect(setLine.mock.calls[0]?.[0]).toMatchObject({
      employeeUserId: "u-emp",
      primaryManagerUserId: "u-new",
      reason: "Team reorganisation",
      secondaryManagers: [],
    });
  });

  it("puts a server refusal on its field", async () => {
    setLine.mockImplementation((_input: unknown, handlers: { onError: (e: unknown) => void }) =>
      handlers.onError(new ApiError("That would create a reporting loop.", 400, "PRIMARY_CYCLE")),
    );
    await openEditor();
    await userEvent.click(screen.getByRole("combobox", { name: "Primary reporting manager" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("That would create a reporting loop.")).toBeInTheDocument();
  });
});

describe("editor schema", () => {
  it("counts only a change of the primary against the threshold", () => {
    expect(exceedsChangeThreshold({ primaryChangesLast24h: 3, changeThreshold: 3 }, false)).toBe(false);
    expect(exceedsChangeThreshold({ primaryChangesLast24h: 3, changeThreshold: 3 }, true)).toBe(true);
    expect(exceedsChangeThreshold({ primaryChangesLast24h: 2, changeThreshold: 3 }, true)).toBe(false);
  });

  it("requires a primary manager unless top-level, and a reason for top-level", () => {
    const base = { ...editorDefaults(makeLine()), primaryManagerUserId: null };
    expect(reportingLineEditorSchema.safeParse(base).success).toBe(false);
    expect(reportingLineEditorSchema.safeParse({ ...base, topLevel: true }).success).toBe(false);
    expect(reportingLineEditorSchema.safeParse({ ...base, topLevel: true, topLevelReason: "Founder" }).success).toBe(true);
  });

  it("sends top-level as a null primary with its reason and no secondaries", () => {
    const values = { ...editorDefaults(makeLine()), topLevel: true, topLevelReason: "Founder", effectiveFrom: "2026-10-01" };
    expect(editorPayload("u-emp", values)).toEqual({
      employeeUserId: "u-emp",
      primaryManagerUserId: null,
      topLevelReason: "Founder",
      secondaryManagers: [],
      effectiveFrom: "2026-10-01",
    });
  });
});
