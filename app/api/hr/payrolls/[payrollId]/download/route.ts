import { withAuth, err } from "@/lib/api/helpers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payrolls, users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  return withAuth(async (session) => {
    const { payrollId: id } = await params;
    const payrollId = Number(id);
    if (!payrollId) return err("Invalid payroll ID.", 400);

    const payroll = await db.query.payrolls.findFirst({
      where: and(eq(payrolls.id, payrollId), eq(payrolls.orgId, session.orgId)),
    });
    if (!payroll) return err("Payroll not found.", 404);
    if (payroll.status !== "PAID") return err("Payslip only available for PAID payrolls.", 400);

    // Only admins or the employee themselves can download
    const isAdmin = session.user.role === "CEO" || session.user.role === "HR";
    if (!isAdmin && payroll.userId !== session.user.id) {
      return err("Access denied.", 403);
    }

    const employee = await db.query.users.findFirst({
      where: eq(users.id, payroll.userId),
    });
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.orgId),
    });

    const monthLabel = payroll.month
      ? format(new Date(payroll.month + "-01"), "MMMM yyyy")
      : "Unknown Month";

    const fmt = (v: string | null | undefined) =>
      `₹${parseFloat(v || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    const empName = `${employee?.name ?? "Employee"}`;
    const empDesignation = employee?.designation ?? "—";
    const orgName = org?.name ?? "Company";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payslip – ${empName} – ${monthLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; padding: 24px; }
    .payslip { max-width: 700px; margin: 0 auto; background: #fff; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
    .header { background: #0f2b7f; color: #fff; padding: 24px 28px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header .month { font-size: 14px; opacity: 0.85; margin-top: 4px; }
    .badge { background: #bd882c; color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
    .section { padding: 20px 28px; border-bottom: 1px solid #eee; }
    .section h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 12px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field label { font-size: 11px; color: #888; display: block; margin-bottom: 2px; }
    .field span { font-size: 14px; color: #111; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; }
    table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.04em; padding: 6px 0; border-bottom: 1px solid #eee; }
    table td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #f5f5f5; }
    table td:last-child { text-align: right; font-weight: 500; }
    .net-row { background: #f8f9ff; }
    .net-row td { font-size: 15px; font-weight: 700; color: #0f2b7f; padding: 12px 8px; }
    .footer { padding: 16px 28px; font-size: 11px; color: #999; text-align: center; }
    @media print {
      body { background: #fff; padding: 0; }
      .payslip { border: none; box-shadow: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
      <div>
        <h1>${orgName}</h1>
        <div class="month">Payslip for ${monthLabel}</div>
      </div>
      <span class="badge">PAID</span>
    </div>

    <div class="section">
      <h2>Employee Details</h2>
      <div class="grid2">
        <div class="field"><label>Name</label><span>${empName}</span></div>
        <div class="field"><label>Designation</label><span>${empDesignation}</span></div>
        <div class="field"><label>Employee ID</label><span>${employee?.employeeId ?? "—"}</span></div>
        <div class="field"><label>Payroll Month</label><span>${monthLabel}</span></div>
      </div>
    </div>

    <div class="section">
      <h2>Earnings &amp; Deductions</h2>
      <table>
        <thead>
          <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
        </thead>
        <tbody>
          <tr><td>Basic Salary</td><td>${fmt(payroll.basicSalary)}</td></tr>
          ${payroll.hra && parseFloat(payroll.hra) > 0 ? `<tr><td>HRA</td><td>${fmt(payroll.hra)}</td></tr>` : ""}
          ${payroll.allowances && parseFloat(payroll.allowances) > 0 ? `<tr><td>Allowances</td><td>${fmt(payroll.allowances)}</td></tr>` : ""}
          ${payroll.overtimeAmount && parseFloat(payroll.overtimeAmount) > 0 ? `<tr><td>Overtime</td><td>${fmt(payroll.overtimeAmount)}</td></tr>` : ""}
          <tr><td>Gross Salary</td><td>${fmt(payroll.grossSalary)}</td></tr>
          ${payroll.deductions && parseFloat(payroll.deductions) > 0 ? `<tr style="color:#c0392b"><td>Deductions</td><td>-${fmt(payroll.deductions)}</td></tr>` : ""}
          <tr class="net-row"><td>Net Salary</td><td>${fmt(payroll.netSalary)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      This is a computer-generated payslip and does not require a signature. &nbsp;|&nbsp;
      Generated on ${format(new Date(), "dd MMM yyyy")}
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:16px;">
    <button onclick="window.print()" style="padding:8px 20px;background:#0f2b7f;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="payslip-${empName.replace(/\s+/g, "-")}-${payroll.month ?? "unknown"}.html"`,
      },
    });
  });
}
