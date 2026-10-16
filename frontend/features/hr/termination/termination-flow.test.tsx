import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import {
  terminationItemContract,
  terminationRowContract,
} from "@/hooks/api/hr/termination-schema";

jest.mock("@/components/shared/hr-sheet", () => ({
  HrSheet: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
}));

jest.mock("@/components/ui/combobox", () => ({
  Combobox: ({ options, value }: { options: Array<{ value: string; label: string }>; value: string }) => (
    <span data-testid="employee-combobox">{options.find((option) => option.value === value)?.label ?? "Select an employee…"}</span>
  ),
}));

import { TerminationFormSheet } from "./termination-form-sheet";
import { TerminationList } from "./termination-list";

const createdRow = {
  id: 12,
  orgId: "org-1",
  userId: "user-9",
  status: "COMPLETED",
  reasons: ["Misconduct"],
  detailedExplanation: "",
  effectiveDate: "2026-10-14",
  severanceAmount: null,
  noticePeriodWaived: false,
  internalNotes: null,
  createdAt: "2026-10-14T05:00:00.000Z",
  updatedAt: "2026-10-14T05:00:00.000Z",
  finalRemarks: null,
  finalReviewedBy: "owner-1",
  finalReviewedAt: "2026-10-14T05:00:00.000Z",
  emailSentAt: null,
  emailStatus: null,
  initiatedBy: "owner-1",
  userMembershipId: null,
  terminationLetterUrl: null,
  supportingDocUrls: [],
  rowVersion: 2,
};

const noop = jest.fn();

describe("termination create response", () => {
  it("parses the row POST /hr/termination returns, which carries no employee join", () => {
    expect(terminationRowContract.safeParse(createdRow).success).toBe(true);
    expect(terminationItemContract.safeParse(createdRow).success).toBe(false);
  });
});

describe("TerminationFormSheet prefill from a profile link", () => {
  function renderSheet(prefilled: boolean) {
    render(
      <TerminationFormSheet
        open
        onOpenChange={noop}
        canApproveExit
        isPending={false}
        onSubmit={noop}
        employees={[]}
        prefilledEmployee={
          prefilled
            ? { id: "user-9", name: "Amit Shah", firstName: null, lastName: null, email: "amit@example.com", designation: null }
            : null
        }
        selectedEmployeeUserId="user-9"
        onSelectedEmployeeUserIdChange={noop}
        selectedReason=""
        onSelectedReasonChange={noop}
        remarks=""
        onRemarksChange={noop}
        effectiveDate=""
        onEffectiveDateChange={noop}
        noticePeriodWaived={false}
        onNoticePeriodWaivedChange={noop}
        severanceAmount=""
        onSeveranceAmountChange={noop}
        internalNotes=""
        onInternalNotesChange={noop}
        saveAsDraft={false}
        onSaveAsDraftChange={noop}
      />,
    );
  }

  it("shows the named employee even when the option list has not reached them", () => {
    renderSheet(true);
    expect(screen.getByTestId("employee-combobox")).toHaveTextContent("Amit Shah");
  });

  it("falls back to the placeholder when nothing resolved the id", () => {
    renderSheet(false);
    expect(screen.getByTestId("employee-combobox")).toHaveTextContent("Select an employee…");
  });

  it("lets an approver keep the termination as a draft (HR-U-026)", () => {
    renderSheet(false);
    expect(screen.getByRole("switch", { name: "Save as draft" })).toBeInTheDocument();
  });
});

describe("TerminationList row actions", () => {
  function renderRow(record: Record<string, unknown>) {
    const row = { ...createdRow, employee: { id: "user-9", name: "Amit Shah", email: null, designation: null, employeeId: null }, ...record };
    render(
      <TerminationList
        terminations={[terminationItemContract.parse(row)]}
        statusCounts={{ ALL: 1 }}
        pagination={{ limit: 20, hasMore: false, nextCursor: null }}
        page={1}
        isFetching={false}
        onPreviousPage={noop}
        onNextPage={noop}
        canManageExit
        canApproveExit
        statusFilter="ALL"
        onStatusFilterChange={noop}
        onView={noop}
        onSubmit={noop}
        onApprove={noop}
        onReject={noop}
        onSendEmail={noop}
        onComplete={noop}
        isSubmitting={false}
        isCompleting={false}
      />,
    );
  }

  it("still offers the letter for a termination that took effect before any email went out", () => {
    renderRow({ status: "COMPLETED", emailSentAt: null });
    expect(screen.getByRole("button", { name: /Send termination email/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Complete termination/ })).not.toBeInTheDocument();
  });

  it("offers completion of an approved termination already in effect, without requiring the email first", () => {
    renderRow({ status: "APPROVED", effectiveDate: "2020-01-01" });
    expect(screen.getByRole("button", { name: /Complete termination/ })).toBeInTheDocument();
  });

  it("hides completion of a future-dated approval", () => {
    renderRow({ status: "APPROVED", effectiveDate: "2999-01-01" });
    expect(screen.queryByRole("button", { name: /Complete termination/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send termination email/ })).toBeInTheDocument();
  });
});
