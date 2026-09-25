import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReportingLineView } from "@/hooks/api/hr/reporting-lines-schema";
import { ApiError } from "@/lib/api-envelope";
import { ReportingLineSection } from "./reporting-line-section";
import { editorPayload, requiresChangeReason, reportingLineEditorSchema, editorDefaults, upcomingSecondaries } from "./reporting-line-editor-schema";

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
jest.mock("@/lib/date-utils", () => ({ ...jest.requireActual("@/lib/date-utils"), getTodayString: () => "2026-09-26" }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

function secondaryEntry(lineId: number, name: string, effectiveFrom: string): ReportingLineView["secondary"][number] {
  return {
    lineId,
    relationshipType: "SECONDARY",
    label: "Project",
    manager: { userId: `u-${lineId}`, name, email: null, designation: null, state: "active" },
    effectiveFrom,
    effectiveTo: null,
    source: "MANUAL",
    isFallback: false,
    fallbackConfirmedAt: null,
    recordedAt: "2026-09-01T00:00:00Z",
    changeReason: null,
  };
}

const CURRENT_SECONDARY = secondaryEntry(21, "Cara Current", "2026-01-01");
const SCHEDULED_SECONDARY = secondaryEntry(22, "Fern Future", "2026-10-01");

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
    expect(screen.queryByText(/in the last 24 hours/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("derives the warning from the server's counts alone, before any edit", async () => {
    line = makeLine({ primaryChangesLast24h: 3, changeThreshold: 3 });
    await openEditor();
    expect(screen.getByRole("status")).toHaveTextContent("changed 3 times in the last 24 hours (limit 3)");
    expect(screen.getByRole("textbox", { name: /Reason \*/ })).toBeInTheDocument();
  });

  it("leaves the authority decision to the server for a viewer without override", async () => {
    line = makeLine({ primaryChangesLast24h: 3 });
    await openEditor();
    expect(screen.getByRole("status")).toHaveTextContent("an HR or org admin");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
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

describe("Reporting line editor — scheduled additional managers (never re-dated)", () => {
  async function openEditor() {
    can.mockImplementation((key: string) => key === "hr:reporting-lines:manage");
    render(<ReportingLineSection employeeId="u-emp" />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  }

  it("loads only current additional managers into the form and lists scheduled ones read-only with their start", async () => {
    line = makeLine({ secondary: [CURRENT_SECONDARY, SCHEDULED_SECONDARY] });
    await openEditor();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Additional manager 1")).toBeInTheDocument();
    expect(within(dialog).queryByText("Additional manager 2")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Fern Future")).toBeInTheDocument();
    expect(within(dialog).getByText(/starts/i)).toHaveTextContent(/Oct/);
  });

  it("does not send additional managers when only the primary changed, so a scheduled one keeps its date", async () => {
    line = makeLine({ secondary: [CURRENT_SECONDARY, SCHEDULED_SECONDARY] });
    await openEditor();
    await userEvent.click(screen.getByRole("combobox", { name: "Primary reporting manager" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(setLine).toHaveBeenCalled());
    expect(setLine.mock.calls[0]?.[0]).not.toHaveProperty("secondaryManagers");
  });

  it("sends the edited set when additional managers change", async () => {
    line = makeLine({ secondary: [CURRENT_SECONDARY] });
    await openEditor();
    await userEvent.click(screen.getByRole("button", { name: "Remove additional manager 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(setLine).toHaveBeenCalled());
    expect(setLine.mock.calls[0]?.[0]).toMatchObject({ secondaryManagers: [] });
  });
});

describe("editor schema", () => {
  it("splits current from scheduled additional managers on the given day", () => {
    const withBoth = makeLine({ secondary: [CURRENT_SECONDARY, SCHEDULED_SECONDARY] });
    expect(editorDefaults(withBoth, "2026-09-26").secondaryManagers.map((entry) => entry.managerUserId)).toEqual(["u-21"]);
    expect(upcomingSecondaries(withBoth, "2026-09-26").map((entry) => entry.lineId)).toEqual([22]);
    expect(editorDefaults(withBoth, "2026-10-01").secondaryManagers).toHaveLength(2);
  });

  it("requires a reason exactly when the server's counts reach its threshold", () => {
    expect(requiresChangeReason({ primaryChangesLast24h: 3, changeThreshold: 3 })).toBe(true);
    expect(requiresChangeReason({ primaryChangesLast24h: 2, changeThreshold: 3 })).toBe(false);
    expect(requiresChangeReason({ primaryChangesLast24h: 1, changeThreshold: 1 })).toBe(true);
  });

  it("requires a primary manager unless top-level, and a reason for top-level", () => {
    const base = { ...editorDefaults(makeLine(), "2026-09-26"), primaryManagerUserId: null };
    expect(reportingLineEditorSchema.safeParse(base).success).toBe(false);
    expect(reportingLineEditorSchema.safeParse({ ...base, topLevel: true }).success).toBe(false);
    expect(reportingLineEditorSchema.safeParse({ ...base, topLevel: true, topLevelReason: "Founder" }).success).toBe(true);
  });

  it("sends top-level as a null primary with its reason and no secondaries", () => {
    const values = { ...editorDefaults(makeLine(), "2026-09-26"), topLevel: true, topLevelReason: "Founder", effectiveFrom: "2026-10-01" };
    expect(editorPayload("u-emp", values, { secondariesChanged: false })).toEqual({
      employeeUserId: "u-emp",
      primaryManagerUserId: null,
      topLevelReason: "Founder",
      secondaryManagers: [],
      effectiveFrom: "2026-10-01",
    });
  });
});
