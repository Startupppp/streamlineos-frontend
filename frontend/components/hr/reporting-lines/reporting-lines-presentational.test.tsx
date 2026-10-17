import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  REPORTING_REQUEST_STATUS_MAP,
  REPORTING_ROW_STATUS_MAP,
  ReportingRequestStatusBadge,
  ReportingRowStatusBadge,
} from "./reporting-status-badge";
import { ReportingRelationshipBadge } from "./reporting-relationship-badge";
import { ConfirmationPhraseInput } from "./confirmation-phrase-input";
import { createConfirmationPhraseSchema } from "./confirmation-phrase-schema";

describe("reporting row status badge", () => {
  it.each([
    ["READY", "Ready"],
    ["WARNING", "Warning"],
    ["ERROR", "Error"],
    ["SKIPPED", "Skipped"],
  ])("labels %s as %s", (status, label) => {
    render(<ReportingRowStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("keeps a warning distinct from an error (PRD §7.3.7)", () => {
    expect(REPORTING_ROW_STATUS_MAP.WARNING?.tone).toBe("warning");
    expect(REPORTING_ROW_STATUS_MAP.ERROR?.tone).toBe("danger");
  });

  it("covers every request lifecycle status", () => {
    expect(Object.keys(REPORTING_REQUEST_STATUS_MAP).sort()).toEqual(
      ["APPROVED", "CANCELLED", "EXPIRED", "MORE_INFO_REQUIRED", "PENDING", "REJECTED"],
    );
    render(<ReportingRequestStatusBadge status="MORE_INFO_REQUIRED" />);
    expect(screen.getByText("More info needed")).toBeInTheDocument();
  });
});

describe("reporting relationship badge", () => {
  it("states a fallback assignment in the PRD's words", () => {
    render(<ReportingRelationshipBadge kind="fallback" />);
    expect(screen.getByText("Temporarily assigned by onboarding policy")).toBeInTheDocument();
  });

  it("shows a secondary manager's descriptive label, or 'Additional' without one", () => {
    const { rerender } = render(<ReportingRelationshipBadge kind="secondary" label="Functional" />);
    expect(screen.getByText("Functional")).toBeInTheDocument();
    rerender(<ReportingRelationshipBadge kind="secondary" label="  " />);
    expect(screen.getByText("Additional")).toBeInTheDocument();
  });

  it("ignores a label on a primary line", () => {
    render(<ReportingRelationshipBadge kind="primary" label="Functional" />);
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.queryByText("Functional")).not.toBeInTheDocument();
  });
});

describe("confirmation phrase", () => {
  it("describes the input with the phrase and keeps a caller's description", async () => {
    render(
      <>
        <label htmlFor="phrase">Confirmation</label>
        <p id="caller-hint">Affects 12 employees</p>
        <ConfirmationPhraseInput id="phrase" phrase="CONFIRM 12" aria-describedby="caller-hint" />
      </>,
    );
    const input = screen.getByRole("textbox", { name: "Confirmation" });
    expect(input).toHaveAccessibleDescription(/Type CONFIRM 12 to confirm\..*Affects 12 employees/);
    await userEvent.type(input, "CONFIRM 12");
    expect(input).toHaveValue("CONFIRM 12");
  });

  it("accepts only the exact phrase, ignoring surrounding whitespace", () => {
    const schema = createConfirmationPhraseSchema("CONFIRM 12");
    expect(schema.safeParse({ confirmationPhrase: " CONFIRM 12 " }).success).toBe(true);
    expect(schema.safeParse({ confirmationPhrase: "confirm 12" }).success).toBe(false);
    expect(schema.safeParse({ confirmationPhrase: "CONFIRM 11" }).success).toBe(false);
    expect(schema.safeParse({ confirmationPhrase: "" }).success).toBe(false);
  });
});
