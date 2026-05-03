import { withAuth, err } from "@/lib/api/helpers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payrolls, users, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format } from "date-fns";
import fs from "fs/promises";
import path from "path";
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

    const daysInPayMonth = payroll.month
      ? (() => {
          const [yr, mo] = payroll.month.split("-").map(Number);
          return new Date(yr, mo, 0).getDate();
        })()
      : 30;

    const fmt = (v: string | null | undefined) =>
      `₹${parseFloat(v || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    const empName = `${employee?.name ?? "Employee"}`;
    const empDesignation = employee?.designation ?? "—";
    const orgName = org?.name ?? "Vaivamm Capital Advisors LLP";
    const orgFullName = "Vaivamm Capital Advisors LLP";

    const basic = parseFloat(payroll.basicSalary || "0");
    const hra = parseFloat(payroll.hra || "0");
    const specialAllowance = parseFloat((payroll as { specialAllowance?: string | null }).specialAllowance ?? "0");
    const bonus = parseFloat(payroll.allowances || "0");
    const overtime = parseFloat(payroll.overtimeAmount || "0");
    const gross = parseFloat(payroll.grossSalary || "0");
    const lopAmount = parseFloat((payroll as { lopAmount?: string | null }).lopAmount ?? "0");
    const ptAmount = parseFloat((payroll as { ptAmount?: string | null }).ptAmount ?? "200");
    const advanceRecovery = parseFloat((payroll as { advanceRecoveryAmount?: string | null }).advanceRecoveryAmount ?? "0");
    const net = parseFloat(payroll.netSalary || "0");

    const orgAddress = org?.address;
    const addressLine = [orgAddress?.city, orgAddress?.state, orgAddress?.country]
      .filter(Boolean).join(", ");

    const pan = employee?.taxId ?? "—";
    const bank = employee?.bankDetails;
    const maskedAccount = bank?.accountNumber
      ? "XXXX" + bank.accountNumber.slice(-4)
      : "—";
    const pfUan = bank?.pfUanNumber || null;
    const joiningDate = employee?.joiningDate
      ? format(new Date(employee.joiningDate), "dd MMM yyyy")
      : "—";

    let logoSvg = "";
    try {
      const svgPath = path.join(process.cwd(), "public", "logo.svg");
      const svgContent = await fs.readFile(svgPath, "utf-8");
      logoSvg = svgContent
        .replace(/<\?xml[^?]*\?>/, "")
        .replace(/viewBox="[^"]*"/, 'viewBox="0 0 180 180" width="54" height="54"');
    } catch {
    }

    function toWords(n: number): string {
      const a = ["", "One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
        "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
        "Seventeen","Eighteen","Nineteen"];
      const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
      if (n === 0) return "Zero";
      function helper(num: number): string {
        if (num < 20) return a[num];
        if (num < 100) return b[Math.floor(num/10)] + (num%10 ? " " + a[num%10] : "");
        if (num < 1000) return a[Math.floor(num/100)] + " Hundred" + (num%100 ? " " + helper(num%100) : "");
        if (num < 100000) return helper(Math.floor(num/1000)) + " Thousand" + (num%1000 ? " " + helper(num%1000) : "");
        if (num < 10000000) return helper(Math.floor(num/100000)) + " Lakh" + (num%100000 ? " " + helper(num%100000) : "");
        return helper(Math.floor(num/10000000)) + " Crore" + (num%10000000 ? " " + helper(num%10000000) : "");
      }
      return helper(Math.floor(n)) + " Rupees Only";
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payslip – ${empName} – ${monthLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, 'Segoe UI', sans-serif; background: #f0f0f0; color: #111; font-size: 13px; }
    .page { max-width: 800px; margin: 20px auto; background: #fff; border: 1px solid #ccc; }

    
    .header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 3px solid #0f2b7f; gap: 16px; }
    .header-logo { width: 64px; height: 64px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #bd882c; font-size: 22px; font-weight: 900; letter-spacing: -1px; flex-shrink: 0; overflow: hidden; }
    .header-logo svg { width: 54px; height: 54px; }
    .header-company { flex: 1; }
    .header-company h1 { font-size: 20px; font-weight: 700; color: #0f2b7f; }
    .header-company p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-slip { text-align: right; }
    .header-slip h2 { font-size: 15px; font-weight: 700; color: #111; }
    .header-slip p { font-size: 11px; color: #555; margin-top: 2px; }
    .paid-badge { display: inline-block; background: #15803d; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 3px; margin-top: 4px; letter-spacing: 0.05em; }

    
    .emp-bar { background: #0f2b7f; color: #fff; padding: 8px 20px; display: flex; gap: 40px; flex-wrap: wrap; }
    .emp-bar .ef { display: flex; flex-direction: column; }
    .emp-bar .ef-label { font-size: 9px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.06em; }
    .emp-bar .ef-val { font-size: 13px; font-weight: 600; margin-top: 1px; }

    
    .detail-section { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #ddd; }
    .detail-col { padding: 14px 20px; }
    .detail-col:first-child { border-right: 1px solid #ddd; }
    .detail-col h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0f2b7f; border-bottom: 1px solid #e0e8ff; padding-bottom: 5px; margin-bottom: 10px; }
    .dl { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .dl .dk { font-size: 11px; color: #555; }
    .dl .dv { font-size: 11px; font-weight: 600; color: #111; text-align: right; }

    
    .salary-section { padding: 0 20px 16px; }
    .salary-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0f2b7f; padding: 12px 0 6px; border-bottom: 1px solid #e0e8ff; margin-bottom: 0; }
    table.salary { width: 100%; border-collapse: collapse; }
    table.salary thead tr { background: #f5f7ff; }
    table.salary th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0f2b7f; padding: 7px 10px; border: 1px solid #dde3f0; text-align: left; }
    table.salary th:not(:first-child) { text-align: right; }
    table.salary td { padding: 6px 10px; border: 1px solid #eef0f6; font-size: 12px; vertical-align: top; }
    table.salary td:not(:first-child) { text-align: right; }
    table.salary tr.subtotal td { background: #f5f7ff; font-weight: 600; border-top: 2px solid #dde3f0; }
    table.salary tr.deduction td { color: #b91c1c; }

    
    .net-bar { background: #0f2b7f; color: #fff; margin: 0 0 0 0; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; }
    .net-bar .nb-label { font-size: 13px; font-weight: 700; }
    .net-bar .nb-amt { font-size: 18px; font-weight: 800; color: #bd882c; }
    .net-words { background: #f5f7ff; padding: 7px 20px; font-size: 11px; color: #333; border-bottom: 2px solid #0f2b7f; font-style: italic; }

    
    .bottom-section { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #ddd; }
    .bottom-col { padding: 14px 20px; }
    .bottom-col:first-child { border-right: 1px solid #ddd; }
    .bottom-col h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0f2b7f; border-bottom: 1px solid #e0e8ff; padding-bottom: 5px; margin-bottom: 10px; }
    .sign-area { margin-top: 24px; border-top: 1px solid #aaa; padding-top: 6px; font-size: 10px; color: #666; text-align: center; }

    
    .footer { background: #f9f9f9; border-top: 1px solid #e0e0e0; padding: 8px 20px; font-size: 10px; color: #888; text-align: center; }

    @media print {
      body { background: #fff; }
      .page { border: none; margin: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:12px;background:#e8edf7;">
    <button onclick="window.print()" style="padding:8px 22px;background:#0f2b7f;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;">
      ⬇ Print / Save as PDF
    </button>
  </div>

  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-logo">${logoSvg || "V"}</div>
      <div class="header-company">
        <h1>${orgFullName}</h1>
        ${addressLine ? `<p>${addressLine}</p>` : ""}
      </div>
      <div class="header-slip">
        <h2>Salary Slip</h2>
        <p>For the month of ${monthLabel}</p>
        <div class="paid-badge">PAID</div>
      </div>
    </div>

    <!-- Employee blue bar -->
    <div class="emp-bar">
      <div class="ef"><span class="ef-label">Employee Name</span><span class="ef-val">${empName}</span></div>
      <div class="ef"><span class="ef-label">Employee ID</span><span class="ef-val">${employee?.employeeId ?? "—"}</span></div>
      <div class="ef"><span class="ef-label">Designation</span><span class="ef-val">${empDesignation}</span></div>
      <div class="ef"><span class="ef-label">Department</span><span class="ef-val">${employee?.team ?? employee?.role ?? "—"}</span></div>
    </div>

    <!-- Employee details -->
    <div class="detail-section">
      <div class="detail-col">
        <h3>Employee Information</h3>
        <div class="dl"><span class="dk">Date of Joining</span><span class="dv">${joiningDate}</span></div>
        <div class="dl"><span class="dk">PAN Number</span><span class="dv">${pan}</span></div>
        ${pfUan ? `<div class="dl"><span class="dk">PF UAN</span><span class="dv">${pfUan}</span></div>` : ""}
        <div class="dl"><span class="dk">Email</span><span class="dv">${employee?.email ?? "—"}</span></div>
      </div>
      <div class="detail-col">
        <h3>Payroll Information</h3>
        <div class="dl"><span class="dk">Pay Period</span><span class="dv">${monthLabel}</span></div>
        <div class="dl"><span class="dk">Payment Mode</span><span class="dv">Bank Transfer</span></div>
        <div class="dl"><span class="dk">Working Days</span><span class="dv">${daysInPayMonth}</span></div>
      </div>
    </div>

    <!-- Salary breakdown -->
    <div class="salary-section">
      <div class="salary-title">Salary Breakdown</div>
      <table class="salary">
        <thead>
          <tr>
            <th>Earnings</th>
            <th>Amount (₹)</th>
            <th>Deductions</th>
            <th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Basic Salary</td>
            <td>${fmt(payroll.basicSalary)}</td>
            <td>Professional Tax</td>
            <td class="deduction">${ptAmount > 0 ? fmt(String(ptAmount)) : "—"}</td>
          </tr>
          ${hra > 0 ? `<tr><td>House Rent Allowance (HRA)</td><td>${fmt(payroll.hra)}</td><td>${lopAmount > 0 ? "Loss of Pay" : ""}</td><td class="deduction">${lopAmount > 0 ? fmt(String(lopAmount)) : ""}</td></tr>` : ""}
          ${specialAllowance > 0 ? `<tr><td>Special Allowance</td><td>${fmt(String(specialAllowance))}</td><td>${advanceRecovery > 0 ? "Advance Recovery" : ""}</td><td class="deduction">${advanceRecovery > 0 ? fmt(String(advanceRecovery)) : ""}</td></tr>` : ""}
          ${bonus > 0 ? `<tr><td>Bonus</td><td>${fmt(payroll.allowances)}</td><td></td><td></td></tr>` : ""}
          ${overtime > 0 ? `<tr><td>Overtime (${payroll.overtimeDays ?? 0} days)</td><td>${fmt(payroll.overtimeAmount)}</td><td></td><td></td></tr>` : ""}
          <tr class="subtotal">
            <td>Gross Earnings</td>
            <td>${fmt(payroll.grossSalary)}</td>
            <td>Total Deductions</td>
            <td>${fmt(payroll.deductions)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Net pay bar -->
    <div class="net-bar">
      <div class="nb-label">Net Salary Payable</div>
      <div class="nb-amt">${fmt(payroll.netSalary)}</div>
    </div>
    <div class="net-words">In words: <strong>${toWords(net)}</strong></div>

    <!-- Bank + signature -->
    <div class="bottom-section">
      <div class="bottom-col">
        <h3>Bank Details</h3>
        <div class="dl"><span class="dk">Bank Name</span><span class="dv">${bank?.bankName ?? "—"}</span></div>
        <div class="dl"><span class="dk">Account Number</span><span class="dv">${maskedAccount}</span></div>
        <div class="dl"><span class="dk">IFSC Code</span><span class="dv">${bank?.ifsc ?? "—"}</span></div>
        <div class="dl"><span class="dk">Branch</span><span class="dv">${bank?.branch ?? "—"}</span></div>
      </div>
      <div class="bottom-col">
        <h3>Authorisation</h3>
        <p style="font-size:11px;color:#555;margin-bottom:8px;">This is a system-generated payslip and does not require a physical signature.</p>
        <div class="sign-area">Authorised Signatory</div>
      </div>
    </div>

    <div class="footer">
      Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")} &nbsp;·&nbsp; ${orgName} &nbsp;·&nbsp; Confidential — For Employee Use Only
    </div>
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
