import { render, screen } from "@testing-library/react";
import { subDays } from "date-fns";

/**
 * HRMS-E2E-016 (work-logs half).
 *
 * The row used to compute `readOnly || !isOwnLog || !isToday(date) || isLeaveDay`,
 * so a work log was writable only for your own record and only on today's date.
 * Two consequences the acceptance criteria name directly: an HR admin holding
 * hr:attendance:manage could never produce a work-log event for an employee,
 * and nobody could enter yesterday's log.
 *
 * Each assertion below is two-sided — the writable case must expose the write
 * affordance AND the blocked case must still say "No entry", because asserting
 * only one side passes on a row that renders both or neither.
 */

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

import { WorkLogMonthGroup, WORK_LOG_BACKDATE_DAYS } from "./work-log-month-group";

const ME = "user-me";
const EMPLOYEE = "user-employee";

const today = new Date();
const yesterday = subDays(today, 1);
const longAgo = subDays(today, WORK_LOG_BACKDATE_DAYS + 5);

function renderGroup(
  days: Date[],
  overrides: Partial<React.ComponentProps<typeof WorkLogMonthGroup>> = {},
) {
  return render(
    <WorkLogMonthGroup
      monthKey="2026-09"
      label="September 2026"
      allDays={days}
      displayDays={days}
      isCollapsed={false}
      onToggle={() => undefined}
      filled={0}
      searchTerm=""
      logs={[]}
      readOnly={false}
      canEditSaved={false}
      canManageAll={false}
      currentUserId={ME}
      onSave={() => undefined}
      isSaving={false}
      {...overrides}
    />,
  );
}

describe("a work log row is writable for a date other than today", () => {
  it("yesterday is enterable by the owner", () => {
    renderGroup([yesterday]);
    expect(screen.getByRole("button", { name: /^Add work log for /i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^No entry for /i })).not.toBeInTheDocument();
  });

  it("a date beyond the backdating window stays blocked for an ordinary member", () => {
    renderGroup([longAgo]);
    expect(screen.getByRole("button", { name: /^No entry for /i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Add work log for /i })).not.toBeInTheDocument();
  });

  it("a caller holding attendance manage may still correct a date beyond that window", () => {
    renderGroup([longAgo], { canManageAll: true, canEditSaved: true });
    expect(screen.getByRole("button", { name: /^Add work log for /i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^No entry for /i })).not.toBeInTheDocument();
  });
});

describe("an HR admin can produce a work-log event for another employee", () => {
  const employeeLog = [
    { id: 1, userId: EMPLOYEE, date: today.toISOString().slice(0, 10), description: "" },
  ];

  it("an admin viewing an employee's month gets a writable row", () => {
    renderGroup([today], {
      logs: employeeLog,
      canManageAll: true,
      canEditSaved: true,
      readOnly: false,
    });
    expect(screen.getByRole("button", { name: /^Add work log for /i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^No entry for /i })).not.toBeInTheDocument();
  });

  it("a member without attendance manage still cannot write another employee's row", () => {
    renderGroup([today], { logs: employeeLog, canManageAll: false });
    expect(screen.getByRole("button", { name: /^No entry for /i })).toBeInTheDocument();
  });
});
