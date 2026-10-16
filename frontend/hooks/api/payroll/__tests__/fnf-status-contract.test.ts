import { DB_ENUMS } from "@/contracts/db-enums.generated";
import { fnfGetOneContract, fnfInsightsListContract } from "../fnf-schema";

const detail = {
  id: 7,
  orgId: "org-1",
  userId: "user-1",
  basicDues: "57000.00",
  leaveEncashment: "0.00",
  gratuity: "0.00",
  bonusDue: "0.00",
  deductions: "0.00",
  loanRecovery: "0.00",
  netPayable: "57000.00",
  status: "DRAFT",
  approvedBy: null,
  notes: null,
  reimbursementsDue: "0.00",
  assetRecovery: "0.00",
  noticeRecovery: "0.00",
  otherDeductions: "0.00",
  statementPublishedAt: null,
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt: "2026-10-14T00:00:00.000Z",
};

const row = {
  ...detail,
  resignationId: null,
  userMembershipId: 3,
  user: { name: "Amit Shah", email: "amit@example.com" },
};

describe("payroll FnF contracts accept every fnf_status the database holds", () => {
  it("parses a list holding an HR-created DRAFT settlement instead of failing the whole page", () => {
    const parsed = fnfInsightsListContract.parse({ items: [row], total: 1, page: 1, totalPages: 1 });
    expect(parsed.items[0].status).toBe("DRAFT");
  });

  it("parses every DB status and rejects the PENDING value no row can hold", () => {
    for (const status of DB_ENUMS.fnf_status) {
      expect(fnfInsightsListContract.safeParse({ items: [{ ...row, status }], total: 1, page: 1, totalPages: 1 }).success).toBe(true);
    }
    expect(fnfInsightsListContract.safeParse({ items: [{ ...row, status: "PENDING" }], total: 1, page: 1, totalPages: 1 }).success).toBe(false);
  });

  it("parses GET /payroll/fnf/:settlementId, which projects no resignationId or userMembershipId", () => {
    const parsed = fnfGetOneContract.parse({ ...detail, userName: "Amit Shah", userEmail: "amit@example.com" });
    expect(parsed.status).toBe("DRAFT");
    expect(parsed.userName).toBe("Amit Shah");
  });
});
