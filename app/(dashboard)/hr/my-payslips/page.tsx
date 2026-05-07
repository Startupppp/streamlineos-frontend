"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHrEmployeePayslips } from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { format, parseISO } from "date-fns";
import { Download, FileText, Loader2, ArrowLeft } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { numberToWords } from "@/lib/format-utils";

export default function MyPayslipsPage() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const { data: payslips, isLoading } = useHrEmployeePayslips({});

  const selectedPayslip = payslips?.find((p) => p.month === selectedMonth);

  const availableMonths = payslips?.map((p) => ({
    value: p.month,
    label: format(parseISO(p.month + "-01"), "MMMM yyyy"),
  })) || [];

  const handleDownload = async () => {
    if (!selectedPayslip) return;

    toast.loading("Downloading PDF…", { id: "pdf-download" });

    try {
      const res = await fetch(
        `/api/hr/payrolls/${selectedPayslip.id}/download?format=pdf`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || res.statusText || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const employeeName = `${selectedPayslip.user?.firstName || ""}_${selectedPayslip.user?.lastName || ""}`.replace(/\s+/g, "_");
      const monthYear = format(parseISO(selectedMonth + "-01"), "MMM_yyyy");
      a.download = `Payslip_${employeeName || "employee"}_${monthYear}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Payslip downloaded successfully!", { id: "pdf-download" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to download PDF: ${errorMessage}`, { id: "pdf-download" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const basicSalary = parseFloat(selectedPayslip?.basicSalary || "0");
  const hra = parseFloat(selectedPayslip?.hra || "0");
  const specialAllowance = parseFloat(selectedPayslip?.specialAllowance || "0");
  const bonusAmount = parseFloat(selectedPayslip?.allowances || "0");
  const grossSalary = parseFloat(selectedPayslip?.grossSalary || "0");
  const deductions = parseFloat(selectedPayslip?.deductions || "0");
  const netSalary = parseFloat(selectedPayslip?.netSalary || "0");
  const overtimeAmount = parseFloat(selectedPayslip?.overtimeAmount || "0");
  const overtimeType = selectedPayslip?.overtimeType;
  const overtimeDays = parseFloat(selectedPayslip?.overtimeDays || "0");
  const overtimeHoursVal = parseFloat(selectedPayslip?.overtimeHours || "0");
  const lopDaysCount = parseFloat(selectedPayslip?.lopDays || "0");
  const lopAmount = parseFloat(selectedPayslip?.lopAmount || "0");
  const halfDaysCount = parseFloat(selectedPayslip?.halfDays || "0");
  const halfDayAmount = parseFloat(selectedPayslip?.halfDayAmount || "0");
  const ptAmount = parseFloat(selectedPayslip?.ptAmount || "200");
  const pfEmployee = parseFloat(selectedPayslip?.pfEmployee || "0");
  const esiEmployee = parseFloat(selectedPayslip?.esiEmployee || "0");
  const advanceRecovery = parseFloat(selectedPayslip?.advanceRecoveryAmount || "0");
  const otherDeductionsAmount = parseFloat(selectedPayslip?.otherDeductions || "0");
  const structureDeductionsAmount = parseFloat(selectedPayslip?.structureDeductions || "0");
  const calendarDaysInPayMonth = selectedPayslip?.month
    ? (() => {
        const [yr, mo] = selectedPayslip.month.split("-").map(Number);
        return new Date(yr, mo, 0).getDate();
      })()
    : 30;
  const effectiveDaysWorked = calendarDaysInPayMonth - lopDaysCount - halfDaysCount * 0.5;

  const getBankDetail = (key: string): string => {
    const details = selectedPayslip?.user?.bankDetails;
    if (!details || typeof details !== "object" || Array.isArray(details)) return "-";
    const record = details as Record<string, unknown>;
    const value = record[key];
    return typeof value === "string" && value ? value : "-";
  };

  return (
    <PageWrapper
      title="My Payslips"
      subtitle="View and download your salary slips"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-9 w-9"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]" aria-label="Select payslip month">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent className="z-50">
              {availableMonths.length > 0 ? (
                availableMonths.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No payslips available
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      }
    >

      {!selectedMonth ? (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyDocumentsIllustration className="mb-3 mx-auto" />
            <p className="text-muted-foreground">Select a month to view your payslip</p>
          </CardContent>
        </Card>
      ) : selectedPayslip ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleDownload} aria-label="Download payslip as PDF">
              <Download className="mr-2 h-4 w-4" />
              Download Payslip
            </Button>
          </div>

          <div
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
              VAIVAMM
            </div>

            <div className="relative" style={{ zIndex: 1 }}>

              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
                <div style={{
                  width: "64px",
                  height: "64px",
                  backgroundColor: "#0f2b7f",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "24px",
                  fontWeight: "bold"
                }}>
                  V
                </div>
                <div>
                  <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#0f2b7f", letterSpacing: "2px", margin: 0 }}>VAIVAMM</h1>
                  <p style={{ color: "#0f2b7f", fontSize: "12px", letterSpacing: "4px", margin: 0 }}>CAPITAL ADVISORS LLP</p>
                </div>
              </div>

              <h2 style={{ textAlign: "center", fontWeight: "bold", fontSize: "18px", marginTop: "32px", marginBottom: "24px", textDecoration: "underline", color: "#111827" }}>
                PAYSLIP FOR THE MONTH OF {format(parseISO(selectedPayslip.month + "-01"), "MMMM yyyy").toUpperCase()}
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 48px", marginBottom: "32px", fontSize: "14px" }}>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "#374151", width: "160px" }}>Employee Name:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>
                    {selectedPayslip.user?.firstName} {selectedPayslip.user?.lastName}
                  </span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "#374151", width: "160px" }}>Date of Joining:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>
                    {selectedPayslip.user?.joiningDate
                      ? format(new Date(selectedPayslip.user.joiningDate), "dd-MM-yyyy")
                      : "-"}
                  </span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "#374151", width: "160px" }}>Designation:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>
                    {selectedPayslip.user?.designation || "-"}
                  </span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "#374151", width: "160px" }}>No of Days:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>{calendarDaysInPayMonth} Days</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "#374151", width: "160px" }}>Effective Days:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>{effectiveDaysWorked}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "#374151", width: "160px" }}>EMP ID:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>
                    {selectedPayslip.user?.employeeId || "—"}
                  </span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "#374151", width: "160px" }}>PAN Number:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>
                    {selectedPayslip.user?.taxId || "-"}
                  </span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "#374151", width: "160px" }}>Bank Name:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>{getBankDetail("bankName")}</span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "#374151", width: "160px" }}>LOP:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>
                    {lopDaysCount} Day{lopDaysCount === 1 ? "" : "s"}
                    {halfDaysCount > 0 ? ` + ${halfDaysCount} half-day${halfDaysCount === 1 ? "" : "s"}` : ""}
                  </span>
                </div>
                <div style={{ display: "flex" }}>
                  <span style={{ color: "#374151", width: "160px" }}>Bank Acc Number:</span>
                  <span style={{ fontWeight: 500, color: "#111827" }}>{getBankDetail("accountNumber")}</span>
                </div>
              </div>

              {(() => {
                const earnings: { label: string; amount: number }[] = [];
                earnings.push({ label: "Basic Pay", amount: basicSalary });
                if (hra > 0) earnings.push({ label: "House Rent Allowance", amount: hra });
                if (specialAllowance > 0) earnings.push({ label: "Special Allowance", amount: specialAllowance });
                if (bonusAmount > 0) earnings.push({ label: "Bonus / Incentive", amount: bonusAmount });
                if (overtimeAmount > 0) {
                  earnings.push({
                    label:
                      overtimeType === "days"
                        ? `Overtime Pay (${overtimeDays} days)`
                        : overtimeType === "hours"
                        ? `Overtime Pay (${overtimeHoursVal} hours)`
                        : "Overtime Pay",
                    amount: overtimeAmount,
                  });
                }

                const deductionRows: { label: string; amount: number }[] = [];
                if (ptAmount > 0) deductionRows.push({ label: "Professional Tax", amount: ptAmount });
                if (pfEmployee > 0) deductionRows.push({ label: "Provident Fund (PF)", amount: pfEmployee });
                if (esiEmployee > 0) deductionRows.push({ label: "ESI", amount: esiEmployee });
                if (lopAmount > 0) deductionRows.push({ label: `Loss of Pay (${lopDaysCount} day${lopDaysCount === 1 ? "" : "s"})`, amount: lopAmount });
                if (halfDayAmount > 0) deductionRows.push({ label: `Half-Day Deduction (${halfDaysCount} day${halfDaysCount === 1 ? "" : "s"})`, amount: halfDayAmount });
                if (advanceRecovery > 0) deductionRows.push({ label: "Advance Recovery", amount: advanceRecovery });
                if (structureDeductionsAmount > 0) deductionRows.push({ label: "Recurring Deductions", amount: structureDeductionsAmount });
                if (otherDeductionsAmount > 0) deductionRows.push({ label: "Other Deductions", amount: otherDeductionsAmount });

                const rowCount = Math.max(earnings.length, deductionRows.length);
                const cellStyle = { border: "1px solid #9ca3af", padding: "8px 16px" } as const;
                const labelStyle = { ...cellStyle, color: "#374151" };
                const amountStyle = { ...cellStyle, textAlign: "center" as const, color: "#111827" };

                return (
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "14px" }}>
                    <caption className="sr-only">Payslip earnings and deductions breakdown</caption>
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th scope="col" style={{ ...cellStyle, textAlign: "left", fontWeight: 600, color: "#111827" }}>Earnings</th>
                        <th scope="col" style={{ ...cellStyle, textAlign: "center", fontWeight: 600, color: "#111827" }}>Amount</th>
                        <th scope="col" style={{ ...cellStyle, textAlign: "left", fontWeight: 600, color: "#111827" }}>Deductions</th>
                        <th scope="col" style={{ ...cellStyle, textAlign: "center", fontWeight: 600, color: "#111827" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: rowCount }).map((_, i) => (
                        <tr key={i}>
                          <td style={labelStyle}>{earnings[i]?.label ?? ""}</td>
                          <td style={amountStyle}>{earnings[i] ? `₹${earnings[i].amount.toLocaleString("en-IN")}/-` : ""}</td>
                          <td style={labelStyle}>{deductionRows[i]?.label ?? ""}</td>
                          <td style={amountStyle}>{deductionRows[i] ? `₹${deductionRows[i].amount.toLocaleString("en-IN")}/-` : ""}</td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: "#f9fafb" }}>
                        <td style={{ ...cellStyle, fontWeight: 600, color: "#111827" }}>Total Earnings</td>
                        <td style={{ ...cellStyle, textAlign: "center", fontWeight: 600, color: "#111827" }}>₹{grossSalary.toLocaleString("en-IN")}/-</td>
                        <td style={{ ...cellStyle, fontWeight: 600, color: "#111827" }}>Total Deductions</td>
                        <td style={{ ...cellStyle, textAlign: "center", fontWeight: 600, color: "#111827" }}>₹{deductions.toLocaleString("en-IN")}/-</td>
                      </tr>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}></td>
                        <td style={{ ...cellStyle, fontWeight: "bold", color: "#111827" }}>Net Salary</td>
                        <td style={{ ...cellStyle, textAlign: "center", fontWeight: "bold", color: "#111827" }}>₹{netSalary.toLocaleString("en-IN")}/-</td>
                      </tr>
                    </tbody>
                  </table>
                );
              })()}

              <p style={{ marginBottom: "24px", fontSize: "14px", color: "#111827" }}>
                <span style={{ fontWeight: "bold" }}>In Words:</span> {numberToWords(Math.round(netSalary))} Rupees Only
              </p>

              <div style={{ marginBottom: "32px" }}>
                <p style={{ fontWeight: "bold", textDecoration: "underline", color: "#111827", marginBottom: "8px" }}>Declarations and Notes:</p>
                <p style={{ fontSize: "14px", color: "#374151" }}>
                  This is a system-generated Pay slip and does not require a physical signature
                  unless specified by the requester.
                </p>
              </div>

              <div style={{ marginBottom: "32px" }}>
                <p style={{ fontSize: "14px", color: "#111827" }}>For <span style={{ fontWeight: "bold" }}>Vaivamm Capital Advisors LLP</span></p>
                <p style={{ fontSize: "14px", color: "#374151" }}>(Company Stamp/Seal)</p>
                <p style={{ fontSize: "14px", color: "#111827", marginTop: "16px" }}>Employee Signature:</p>
              </div>

              <div style={{ backgroundColor: "#0f2b7f", color: "#ffffff", padding: "16px", borderRadius: "0 0 8px 8px", margin: "-32px -32px -32px -32px", marginTop: "32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span>🌐</span>
                      <span>www.vaivammcapital.com</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>✉</span>
                      <span>support@vaivammcapital.com</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", textAlign: "right" }}>
                    <span>📍</span>
                    <span>
                      Vijay Tech Park, 3rd floor, Plot No 25, Madhapur,
                      <br />
                      HITEC City, Hyderabad, Telangana 500033
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyDocumentsIllustration className="mb-3 mx-auto" />
            <p className="text-muted-foreground">No payslip found for this month</p>
          </CardContent>
        </Card>
      )}

      {payslips && payslips.length > 0 && !selectedMonth && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payslips.slice(0, 6).map((payslip) => (
                <div
                  key={payslip.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  role="button"
                  tabIndex={0}
                  aria-label={`View payslip for ${format(parseISO(payslip.month + "-01"), "MMMM yyyy")}`}
                  onClick={() => setSelectedMonth(payslip.month)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedMonth(payslip.month);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {format(parseISO(payslip.month + "-01"), "MMMM yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {payslip.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ₹{parseFloat(payslip.netSalary || "0").toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Net Salary</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
