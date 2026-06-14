"use client";

import { format, parseISO } from "date-fns";
import { PayslipEarningsTable } from "./payslip-earnings-table";

export interface PayslipUser {
  firstName?: string;
  lastName?: string;
  joiningDate?: string;
  designation?: string;
  employeeId?: string;
  taxId?: string;
  bankDetails?: unknown;
}

export interface PayslipData {
  month: string;
  basicSalary?: string;
  hra?: string;
  allowances?: string;
  grossSalary?: string;
  deductions?: string;
  netSalary?: string;
  overtimeAmount?: string;
  overtimeType?: string;
  overtimeDays?: string;
  overtimeHours?: string;
  user?: PayslipUser;
}

function getBankDetail(payslip: PayslipData, key: string): string {
  const details = payslip.user?.bankDetails;
  if (!details || typeof details !== "object" || Array.isArray(details)) return "-";
  const record = details as Record<string, unknown>;
  const value = record[key];
  return typeof value === "string" && value ? value : "-";
}

interface PayslipPrintViewProps {
  payslip: PayslipData;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function PayslipPrintView({ payslip, containerRef }: PayslipPrintViewProps) {
  const basicSalary = parseFloat(payslip.basicSalary || "0");
  const hra = parseFloat(payslip.hra || "0");
  const allowances = parseFloat(payslip.allowances || "0");
  const grossSalary = parseFloat(payslip.grossSalary || "0");
  const deductions = parseFloat(payslip.deductions || "0");
  const netSalary = parseFloat(payslip.netSalary || "0");
  const overtimeAmount = parseFloat(payslip.overtimeAmount || "0");
  const overtimeDays = parseFloat(payslip.overtimeDays || "0");
  const overtimeHoursVal = parseFloat(payslip.overtimeHours || "0");

  return (
    <div
      ref={containerRef}
      data-payslip-content
      className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto relative overflow-hidden"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      <div
        data-watermark
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 0,
          opacity: 0.06,
          fontSize: "120px",
          fontWeight: "bold",
          color: "#0f2b7f",
          letterSpacing: "20px",
        }}
      >
        STREAMLINEOS
      </div>

      <div className="relative" style={{ zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              backgroundColor: "#0f2b7f",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "24px",
              fontWeight: "bold",
            }}
          >
            V
          </div>
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#0f2b7f",
                letterSpacing: "2px",
                margin: 0,
              }}
            >
              STREAMLINEOS
            </h1>
            <p
              style={{ color: "#0f2b7f", fontSize: "12px", letterSpacing: "4px", margin: 0 }}
            >
              CAPITAL ADVISORS LLP
            </p>
          </div>
        </div>

        <h2
          style={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "18px",
            marginTop: "32px",
            marginBottom: "24px",
            textDecoration: "underline",
            color: "#111827",
          }}
        >
          PAYSLIP FOR THE MONTH OF{" "}
          {format(parseISO(payslip.month + "-01"), "MMMM yyyy").toUpperCase()}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px 48px",
            marginBottom: "32px",
            fontSize: "14px",
          }}
        >
          {[
            ["Employee Name:", `${payslip.user?.firstName ?? ""} ${payslip.user?.lastName ?? ""}`.trim() || "-"],
            ["Date of Joining:", payslip.user?.joiningDate ? format(new Date(payslip.user.joiningDate), "dd-MM-yyyy") : "-"],
            ["Designation:", payslip.user?.designation || "-"],
            ["No of Days:", "31 Days"],
            ["EMP ID:", `VC${payslip.user?.employeeId || "25001"}`],
            ["PAN Number:", payslip.user?.taxId || "-"],
            ["Bank Name:", getBankDetail(payslip, "bankName")],
            ["LOP:", "00 Day"],
            ["Bank Acc Number:", getBankDetail(payslip, "accountNumber")],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex" }}>
              <span style={{ color: "#374151", width: "160px" }}>{label}</span>
              <span style={{ fontWeight: 500, color: "#111827" }}>{value}</span>
            </div>
          ))}
        </div>

        <PayslipEarningsTable
          basicSalary={basicSalary}
          hra={hra}
          allowances={allowances}
          grossSalary={grossSalary}
          deductions={deductions}
          netSalary={netSalary}
          overtimeAmount={overtimeAmount}
          overtimeType={payslip.overtimeType}
          overtimeDays={overtimeDays}
          overtimeHoursVal={overtimeHoursVal}
        />
      </div>
    </div>
  );
}
