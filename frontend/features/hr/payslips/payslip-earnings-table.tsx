"use client";

import { numberToWords } from "@/lib/format-utils";

const BORDER = "1px solid #e5e7eb";
const BORDER_STRONG = "1px solid #d1d5db";

interface PayslipEarningsTableProps {
  basicSalary: number;
  hra: number;
  allowances: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  overtimeAmount: number;
  overtimeType: string | null | undefined;
  overtimeDays: number;
  overtimeHoursVal: number;
}

function fmt(value: number): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PayslipEarningsTable({
  basicSalary,
  hra,
  allowances,
  grossSalary,
  deductions,
  netSalary,
  overtimeAmount,
  overtimeType,
  overtimeDays,
  overtimeHoursVal,
}: PayslipEarningsTableProps) {
  const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: BORDER,
    padding: "9px 14px",
    fontSize: "13px",
    ...extra,
  });

  const headerCell = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: BORDER_STRONG,
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    color: "#374151",
    backgroundColor: "#f3f4f6",
    ...extra,
  });

  const overtimeLabel =
    overtimeType === "days"
      ? `Overtime Pay (${overtimeDays} days)`
      : overtimeType === "hours"
        ? `Overtime Pay (${overtimeHoursVal} hours)`
        : "Overtime Pay";

  return (
    <>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
        <caption style={{ display: "none" }}>Payslip earnings and deductions breakdown</caption>
        <thead>
          <tr>
            <th scope="col" style={headerCell({ textAlign: "left" })}>Earnings</th>
            <th scope="col" style={headerCell({ textAlign: "right", width: "22%" })}>Amount</th>
            <th scope="col" style={headerCell({ textAlign: "left" })}>Deductions</th>
            <th scope="col" style={headerCell({ textAlign: "right", width: "22%" })}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell({ color: "#374151" })}>Basic Pay</td>
            <td style={cell({ textAlign: "right", color: "#111827", fontVariantNumeric: "tabular-nums" })}>
              ₹{fmt(basicSalary)}
            </td>
            <td style={cell({ color: "#374151" })}>Professional Tax</td>
            <td style={cell({ textAlign: "right", color: "#b91c1c", fontVariantNumeric: "tabular-nums" })}>
              ₹200.00
            </td>
          </tr>
          <tr style={{ backgroundColor: "#fafafa" }}>
            <td style={cell({ color: "#374151" })}>House Rent Allowance</td>
            <td style={cell({ textAlign: "right", color: "#111827", fontVariantNumeric: "tabular-nums" })}>
              ₹{fmt(hra)}
            </td>
            <td style={cell()}></td>
            <td style={cell()}></td>
          </tr>
          <tr>
            <td style={cell({ color: "#374151" })}>Special Allowance</td>
            <td style={cell({ textAlign: "right", color: "#111827", fontVariantNumeric: "tabular-nums" })}>
              ₹{fmt(allowances)}
            </td>
            <td style={cell()}></td>
            <td style={cell()}></td>
          </tr>
          {overtimeAmount > 0 && (
            <tr style={{ backgroundColor: "#fafafa" }}>
              <td style={cell({ color: "#374151" })}>{overtimeLabel}</td>
              <td style={cell({ textAlign: "right", color: "#059669", fontVariantNumeric: "tabular-nums" })}>
                ₹{fmt(overtimeAmount)}
              </td>
              <td style={cell()}></td>
              <td style={cell()}></td>
            </tr>
          )}
          <tr style={{ backgroundColor: "#f0fdf4" }}>
            <td style={cell({ fontWeight: 700, color: "#111827" })}>Total Earnings</td>
            <td style={cell({ textAlign: "right", fontWeight: 700, color: "#111827", fontVariantNumeric: "tabular-nums" })}>
              ₹{fmt(grossSalary)}
            </td>
            <td style={cell({ fontWeight: 700, color: "#111827" })}>Total Deductions</td>
            <td style={cell({ textAlign: "right", fontWeight: 700, color: "#b91c1c", fontVariantNumeric: "tabular-nums" })}>
              ₹{fmt(deductions)}
            </td>
          </tr>
          <tr style={{ backgroundColor: "#eff6ff" }}>
            <td style={cell()}></td>
            <td style={cell()}></td>
            <td style={cell({ fontWeight: 800, color: "#1e3a8a", fontSize: "14px" })}>Net Salary</td>
            <td style={cell({ textAlign: "right", fontWeight: 800, color: "#1e3a8a", fontSize: "14px", fontVariantNumeric: "tabular-nums" })}>
              ₹{fmt(netSalary)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginBottom: "20px", padding: "12px 16px", backgroundColor: "#f8fafc", border: BORDER, borderRadius: "6px", fontSize: "13px", color: "#111827" }}>
        <span style={{ fontWeight: 700 }}>Amount in Words: </span>
        {numberToWords(Math.round(netSalary))} Rupees Only
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "28px" }}>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            Declarations
          </p>
          <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.6" }}>
            This is a computer-generated payslip and does not require a physical signature unless specified by the requester.
          </p>
        </div>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            Authorized Signatory
          </p>
          <p style={{ fontSize: "12px", color: "#111827", marginBottom: "2px" }}>
            For StreamlineOS Advisors LLP
          </p>
          <p style={{ fontSize: "12px", color: "#6b7280" }}>(Authorized Signature / Stamp)</p>
        </div>
      </div>

      <div style={{ borderTop: BORDER_STRONG, marginBottom: "20px", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>
            Employee Acknowledgement
          </p>
          <p style={{ fontSize: "12px", color: "#374151" }}>Signature: ___________________________</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Date</p>
          <p style={{ fontSize: "12px", color: "#374151" }}>____________________</p>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#0f2b7f",
          color: "#ffffff",
          padding: "14px 24px",
          margin: "0 -32px -32px -32px",
          borderRadius: "0 0 8px 8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "11px", lineHeight: "1.8" }}>
            <div style={{ fontWeight: 600, marginBottom: "1px" }}>www.streamlineos.app</div>
            <div style={{ color: "#93c5fd" }}>support@streamlineos.app</div>
          </div>
          <div style={{ fontSize: "11px", textAlign: "right", lineHeight: "1.8" }}>
            <div style={{ fontWeight: 600, marginBottom: "1px" }}>Vijay Tech Park, 3rd Floor, Plot No 25</div>
            <div style={{ color: "#93c5fd" }}>Madhapur, HITEC City, Hyderabad 500033</div>
          </div>
        </div>
      </div>
    </>
  );
}
