"use client";

import { numberToWords } from "@/lib/format-utils";

const CELL = "1px solid #9ca3af";

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
  const td = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: CELL,
    padding: "8px 16px",
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
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "14px" }}
      >
        <caption className="sr-only">Payslip earnings and deductions breakdown</caption>
        <thead>
          <tr style={{ backgroundColor: "#f3f4f6" }}>
            <th scope="col" style={td({ textAlign: "left", fontWeight: 600, color: "#111827" })}>
              Earnings
            </th>
            <th scope="col" style={td({ textAlign: "center", fontWeight: 600, color: "#111827" })}>
              Amount
            </th>
            <th scope="col" style={td({ textAlign: "left", fontWeight: 600, color: "#111827" })}>
              Deductions
            </th>
            <th scope="col" style={td({ textAlign: "center", fontWeight: 600, color: "#111827" })}>
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td({ color: "#374151" })}>Basic Pay</td>
            <td style={td({ textAlign: "center", color: "#111827" })}>
              ₹{basicSalary.toLocaleString()}/-
            </td>
            <td style={td({ color: "#374151" })}>Professional Tax</td>
            <td style={td({ textAlign: "center", color: "#111827" })}>₹200/-</td>
          </tr>
          <tr>
            <td style={td({ color: "#374151" })}>House Rent Allowance</td>
            <td style={td({ textAlign: "center", color: "#111827" })}>
              ₹{hra.toLocaleString()}/-
            </td>
            <td style={td()}></td>
            <td style={td()}></td>
          </tr>
          <tr>
            <td style={td({ color: "#374151" })}>Special Allowance</td>
            <td style={td({ textAlign: "center", color: "#111827" })}>
              ₹{allowances.toLocaleString()}/-
            </td>
            <td style={td()}></td>
            <td style={td()}></td>
          </tr>
          {overtimeAmount > 0 && (
            <tr>
              <td style={td({ color: "#374151" })}>{overtimeLabel}</td>
              <td style={td({ textAlign: "center", color: "#111827" })}>
                ₹{overtimeAmount.toLocaleString()}/-
              </td>
              <td style={td()}></td>
              <td style={td()}></td>
            </tr>
          )}
          <tr style={{ backgroundColor: "#f9fafb" }}>
            <td style={td({ fontWeight: 600, color: "#111827" })}>Total Earnings</td>
            <td style={td({ textAlign: "center", fontWeight: 600, color: "#111827" })}>
              ₹{grossSalary.toLocaleString()}/-
            </td>
            <td style={td({ fontWeight: 600, color: "#111827" })}>Total Deductions</td>
            <td style={td({ textAlign: "center", fontWeight: 600, color: "#111827" })}>
              ₹{deductions.toLocaleString()}/-
            </td>
          </tr>
          <tr style={{ backgroundColor: "#f3f4f6" }}>
            <td style={td()}></td>
            <td style={td()}></td>
            <td style={td({ fontWeight: "bold", color: "#111827" })}>Net Salary</td>
            <td style={td({ textAlign: "center", fontWeight: "bold", color: "#111827" })}>
              ₹{netSalary.toLocaleString()}/-
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ marginBottom: "24px", fontSize: "14px", color: "#111827" }}>
        <span style={{ fontWeight: "bold" }}>In Words:</span>{" "}
        {numberToWords(Math.round(netSalary))} Rupees Only
      </p>

      <div style={{ marginBottom: "32px" }}>
        <p
          style={{
            fontWeight: "bold",
            textDecoration: "underline",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          Declarations and Notes:
        </p>
        <p style={{ fontSize: "14px", color: "#374151" }}>
          This is a system-generated Pay slip and does not require a physical signature unless
          specified by the requester.
        </p>
      </div>

      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "14px", color: "#111827" }}>
          For <span style={{ fontWeight: "bold" }}>StreamlineOS Advisors LLP</span>
        </p>
        <p style={{ fontSize: "14px", color: "#374151" }}>(Company Stamp/Seal)</p>
        <p style={{ fontSize: "14px", color: "#111827", marginTop: "16px" }}>
          Employee Signature:
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#0f2b7f",
          color: "#ffffff",
          padding: "16px",
          borderRadius: "0 0 8px 8px",
          margin: "-32px -32px -32px -32px",
          marginTop: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
          }}
        >
          <div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}
            >
              <span>🌐</span>
              <span>www.streamlineos.app</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>✉</span>
              <span>support@streamlineos.app</span>
            </div>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px", textAlign: "right" }}
          >
            <span>📍</span>
            <span>
              Vijay Tech Park, 3rd floor, Plot No 25, Madhapur,
              <br />
              HITEC City, Hyderabad, Telangana 500033
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
