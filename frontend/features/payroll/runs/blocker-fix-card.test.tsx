import { render, screen } from "@testing-library/react";
import { BlockerFixCard, groupBlockers } from "./blocker-fix-card";
import type { RunException } from "@/hooks/api/payroll/run-exceptions-schema";

let mockPage: { data: RunException[]; pagination: { limit: number; hasMore: boolean; nextCursor: null; total: number } } | undefined;
jest.mock("next/link", () => ({ __esModule: true, default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => <a href={href} className={className}>{children}</a> }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/payroll/run-exceptions", () => ({ useRunExceptions: () => ({ data: mockPage }) }));
jest.mock("@/hooks/api/payroll/runs", () => ({ useRecalculateRun: () => ({ mutateAsync: jest.fn() }) }));
jest.mock("@/hooks/api/payroll/payroll-inputs", () => ({
  usePayrollInputPeriods: () => ({ data: { data: [] } }),
  useCreatePayrollInputPeriod: () => ({ mutateAsync: jest.fn() }),
  useBuildPayrollInputPeriod: () => ({ mutateAsync: jest.fn() }),
  useLockPayrollInputPeriod: () => ({ mutateAsync: jest.fn() }),
}));

function blocker(id: number, code: string, userId: string | null, userName: string | null): RunException {
  return { id, code, severity: "BLOCKER", status: "OPEN", message: code, metadata: null, userId, resolvedBy: null, resolvedAt: null, overrideReason: null, createdAt: "2026-10-01", userName, userEmail: null };
}

const BLOCKERS = [
  blocker(1, "MISSING_LOCKED_INPUT_PERIOD", "u1", "Asha"),
  blocker(2, "MISSING_LOCKED_INPUT_PERIOD", "u2", "Ravi"),
  blocker(3, "GROSS_EXCEEDS_CTC", "u3", "Meena"),
];

it("groups blockers by code, largest first, with plain labels", () => {
  const groups = groupBlockers(BLOCKERS);
  expect(groups.map((g) => [g.code, g.items.length])).toEqual([["MISSING_LOCKED_INPUT_PERIOD", 2], ["GROSS_EXCEEDS_CTC", 1]]);
  expect(groups[0]?.label).toBe("Attendance for this month isn't locked yet");
});

it("counts every open blocker and offers a fix for each kind", () => {
  mockPage = { data: BLOCKERS, pagination: { limit: 50, hasMore: false, nextCursor: null, total: 3 } };
  render(<BlockerFixCard runId={7} month="2026-10" isLocked={false} />);
  expect(screen.getByRole("heading", { name: "3 things to fix before you can submit" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Lock attendance and update totals/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Edit salary" })).toHaveAttribute("href", "/payroll/employees/u3");
  expect(screen.getByText("Asha, Ravi")).toBeInTheDocument();
});

it("renders nothing once the run has no open blockers", () => {
  mockPage = { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null, total: 0 } };
  const { container } = render(<BlockerFixCard runId={7} month="2026-10" isLocked={false} />);
  expect(container).toBeEmptyDOMElement();
});
