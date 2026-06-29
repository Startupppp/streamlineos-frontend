"use client";

import { format, parseISO } from "date-fns";
import { PayslipEarningsTable } from "./payslip-earnings-table";
import { useOrgSettings } from "@/hooks/api/organization";
import { resolveImageUrl } from "@/lib/utils";

export interface PayslipUser {
  firstName?: string | null;
  lastName?: string | null;
  joiningDate?: string | null;
  designation?: string | null;
  employeeId?: string | null;
  taxId?: string | null;
  bankDetails?: unknown;
}

export interface PayslipData {
  month: string;
  basicSalary?: string | null;
  hra?: string | null;
  allowances?: string | null;
  grossSalary?: string | null;
  deductions?: string | null;
  netSalary?: string | null;
  overtimeAmount?: string | null;
  overtimeType?: string | null;
  overtimeDays?: string | null;
  overtimeHours?: string | null;
  user?: PayslipUser | null;
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
  const { data: orgSettings } = useOrgSettings({ staleTime: 30 * 60_000 });
  const orgName = orgSettings?.name ?? "STREAMLINEOS";
  const orgLogoUrl = orgSettings?.logo ? resolveImageUrl(orgSettings.logo) : null;
  const orgInitial = orgName.charAt(0).toUpperCase();

  const basicSalary = parseFloat(payslip.basicSalary || "0");
  const hra = parseFloat(payslip.hra || "0");
  const allowances = parseFloat(payslip.allowances || "0");
  const grossSalary = parseFloat(payslip.grossSalary || "0");
  const deductions = parseFloat(payslip.deductions || "0");
  const netSalary = parseFloat(payslip.netSalary || "0");
  const overtimeAmount = parseFloat(payslip.overtimeAmount || "0");
  const overtimeDays = parseFloat(payslip.overtimeDays || "0");
  const overtimeHoursVal = parseFloat(payslip.overtimeHours || "0");

  const employeeName = `${payslip.user?.firstName ?? ""} ${payslip.user?.lastName ?? ""}`.trim() || "-";
  const joiningDate = payslip.user?.joiningDate
    ? format(new Date(payslip.user.joiningDate), "dd MMM yyyy")
    : "-";

  const detailRows: [string, string][] = [
    ["Employee Name", employeeName],
    ["Employee ID", `VC${payslip.user?.employeeId || "25001"}`],
    ["Designation", payslip.user?.designation || "-"],
    ["Date of Joining", joiningDate],
    ["PAN Number", payslip.user?.taxId || "-"],
    ["Bank Name", getBankDetail(payslip, "bankName")],
    ["Bank Account No.", getBankDetail(payslip, "accountNumber")],
  ];

  return (
    <div
      ref={containerRef}
      data-payslip-content
      style={{
        backgroundColor: "#ffffff",
        padding: "32px",
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
        minHeight: "900px",
      }}
    >
      <div
        data-watermark
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-30deg)",
          zIndex: 0,
          opacity: 0.04,
          fontSize: "100px",
          fontWeight: 900,
          color: "#0f2b7f",
          letterSpacing: "16px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {orgName.toUpperCase()}
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            paddingBottom: "20px",
            borderBottom: "2px solid #0f2b7f",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                backgroundColor: "#0f2b7f",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {orgLogoUrl ? (
                <img
                  src={orgLogoUrl}
                  alt={orgName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ color: "#ffffff", fontSize: "22px", fontWeight: 800 }}>
                  {orgInitial}
                </span>
              )}
            </div>
            <div>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#0f2b7f",
                  letterSpacing: "3px",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {orgName.toUpperCase()}
              </h1>
              <p style={{ fontSize: "11px", color: "#6b7280", margin: "4px 0 0", letterSpacing: "0.05em" }}>
                PAYROLL MANAGEMENT
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#0f2b7f",
                color: "#ffffff",
                padding: "6px 16px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                marginBottom: "6px",
              }}
            >
              PAYSLIP
            </div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#111827", margin: 0 }}>
              {format(parseISO(payslip.month + "-01"), "MMMM yyyy").toUpperCase()}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px 40px",
            marginBottom: "24px",
            padding: "16px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        >
          {detailRows.map(([label, value]) => (
            <div key={label} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <span style={{ color: "#6b7280", minWidth: "130px", fontWeight: 500 }}>{label}:</span>
              <span style={{ fontWeight: 600, color: "#111827" }}>{value}</span>
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
          overtimeType={payslip.overtimeType ?? undefined}
          overtimeDays={overtimeDays}
          overtimeHoursVal={overtimeHoursVal}
        />
      </div>
    </div>
  );
}
