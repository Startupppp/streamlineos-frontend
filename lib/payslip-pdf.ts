import "server-only";

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { format } from "date-fns";
import { logger } from "@/lib/logger";

/**
 * Best-effort PDF encryption. pdf-lib does not natively support encryption,
 * so we rely on the `qpdf` system binary if it's installed (Vercel: not by
 * default; self-hosted: usually yes). If unavailable, returns the original
 * unencrypted buffer and logs a warning. Callers should clearly indicate to
 * the recipient whether the PDF is encrypted.
 */
async function tryEncryptPdf(buffer: Buffer, password: string): Promise<{ buffer: Buffer; encrypted: boolean }> {
  if (!password) return { buffer, encrypted: false };
  try {
    const { execFile } = await import("node:child_process");
    const os = await import("node:os");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);

    const tmpIn = path.join(os.tmpdir(), `payslip-in-${process.pid}-${Date.now()}.pdf`);
    const tmpOut = path.join(os.tmpdir(), `payslip-out-${process.pid}-${Date.now()}.pdf`);
    await fs.writeFile(tmpIn, buffer);
    try {
      await exec("qpdf", ["--encrypt", password, password, "256", "--", tmpIn, tmpOut]);
      const encrypted = await fs.readFile(tmpOut);
      return { buffer: encrypted, encrypted: true };
    } finally {
      await Promise.allSettled([fs.unlink(tmpIn), fs.unlink(tmpOut)]);
    }
  } catch (e) {
    logger.warn("Payslip PDF encryption skipped — qpdf unavailable", {
      err: e instanceof Error ? e.message : String(e),
    });
    return { buffer, encrypted: false };
  }
}


export interface PayslipPdfData {
  orgName: string;
  orgAddress?: string;
  employeeName: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  panNumber?: string;
  pfUan?: string;
  /** Optional. When set, the generated PDF is encrypted with this password if qpdf is available. */
  password?: string;
  bankName?: string;
  maskedAccount?: string;
  ifsc?: string;
  joiningDate?: string;
  monthLabel: string;
  basicSalary: number;
  hra: number;
  allowances: number;
  overtimeAmount: number;
  /** When set with overtimeAmount, label includes days or hours (matches HTML payslip). */
  overtimeType?: string | null;
  overtimeDays?: number;
  overtimeHours?: number;
  /** Days in calendar month (payslip header; public holidays are not shown as a separate line). */
  calendarDaysInMonth?: number;
  /** Same as effective calendar days worked (after LOP / half-day adjustments). */
  effectiveDaysWorked?: number;
  /** Loss-of-pay days in the pay month (shown even when 0). */
  lopDays?: number;
  /** Half-day count in the pay month (shown even when 0). */
  halfDays?: number;
  grossSalary: number;
  deductions: number;
  professionalTax?: number;
  netSalary: number;
}

type PayrollLike = {
  month: string | null;
  basicSalary: string | null;
  hra: string | null;
  specialAllowance?: string | null;
  allowances: string | null;
  overtimeType: string | null;
  overtimeDays: string | null;
  overtimeHours: string | null;
  overtimeAmount: string | null;
  grossSalary: string | null;
  deductions: string | null;
  netSalary: string | null;
  ptAmount: string | null;
  lopDays: string | null;
  halfDays: string | null;
};

type UserLike = {
  name: string | null;
  employeeId: string | null;
  designation: string | null;
  team: string | null;
  role: string | null;
  taxId: string | null;
  joiningDate: Date | string | null;
  bankDetails?: {
    accountNumber?: string | null;
    bankName?: string | null;
    ifsc?: string | null;
    pfUanNumber?: string | null;
  } | null;
};

type OrgLike = {
  name: string | null;
  address?: { city?: string | null; state?: string | null; country?: string | null } | null;
};

/** Shared by mark-paid email and download?format=pdf */
export function buildPayslipPdfDataFromPayroll(
  payroll: PayrollLike,
  employee: UserLike,
  org: OrgLike
): PayslipPdfData {
  const monthLabel = payroll.month
    ? format(new Date(payroll.month + "-01"), "MMMM yyyy")
    : "Unknown Month";

  const daysInPayMonth = payroll.month
    ? (() => {
        const [yr, mo] = payroll.month.split("-").map(Number);
        return new Date(yr, mo, 0).getDate();
      })()
    : 30;

  const lopDays = parseFloat(payroll.lopDays ?? "0");
  const halfDays = parseFloat(payroll.halfDays ?? "0");
  const effectiveDays = daysInPayMonth - lopDays - halfDays * 0.5;

  const bank = employee.bankDetails;
  const maskedAccount = bank?.accountNumber
    ? "XXXX" + String(bank.accountNumber).slice(-4)
    : "—";

  const orgAddress = org?.address;
  const addressLine = [orgAddress?.city, orgAddress?.state, orgAddress?.country]
    .filter(Boolean)
    .join(", ");

  return {
    orgName: org?.name ?? "Company",
    orgAddress: addressLine || undefined,
    employeeName: employee.name ?? "Employee",
    employeeId: employee.employeeId ?? undefined,
    designation: employee.designation ?? undefined,
    department: employee.team ?? employee.role ?? undefined,
    panNumber: employee.taxId ?? undefined,
    pfUan: bank?.pfUanNumber || undefined,
    bankName: bank?.bankName ?? undefined,
    maskedAccount,
    ifsc: bank?.ifsc ?? undefined,
    joiningDate: employee.joiningDate
      ? format(new Date(employee.joiningDate), "dd MMM yyyy")
      : undefined,
    monthLabel,
    basicSalary: parseFloat(payroll.basicSalary || "0"),
    hra: parseFloat(payroll.hra || "0"),
    allowances:
      parseFloat(payroll.specialAllowance ?? "0") + parseFloat(payroll.allowances ?? "0"),
    overtimeAmount: parseFloat(payroll.overtimeAmount || "0"),
    overtimeType: payroll.overtimeType,
    overtimeDays: parseFloat(payroll.overtimeDays ?? "0"),
    overtimeHours: parseFloat(payroll.overtimeHours ?? "0"),
    calendarDaysInMonth: daysInPayMonth,
    effectiveDaysWorked: effectiveDays,
    lopDays,
    halfDays,
    grossSalary: parseFloat(payroll.grossSalary || "0"),
    deductions: parseFloat(payroll.deductions || "0"),
    professionalTax: parseFloat(payroll.ptAmount ?? "200"),
    netSalary: parseFloat(payroll.netSalary || "0"),
  };
}


const NAVY = rgb(0.059, 0.169, 0.498);
const GOLD = rgb(0.741, 0.533, 0.173);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.94, 0.95, 0.98);
const GREEN = rgb(0.086, 0.502, 0.243);
const RED = rgb(0.7, 0.1, 0.1);


function toWords(n: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function helper(num: number): string {
    if (num < 20) return a[num] ?? "";
    if (num < 100) return (b[Math.floor(num / 10)] ?? "") + (num % 10 ? " " + (a[num % 10] ?? "") : "");
    if (num < 1000) return (a[Math.floor(num / 100)] ?? "") + " Hundred" + (num % 100 ? " " + helper(num % 100) : "");
    if (num < 100000) return helper(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + helper(num % 1000) : "");
    if (num < 10000000) return helper(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + helper(num % 100000) : "");
    return helper(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + helper(n % 10000000) : "");
  }

  if (n === 0) return "Zero Rupees Only";
  return helper(Math.floor(n)) + " Rupees Only";
}

function fmt(v: number): string {
  return "Rs " + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function drawRect(
  page: PDFPage,
  x: number, y: number, w: number, h: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function drawText(
  page: PDFPage,
  text: string,
  x: number, y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb> = BLACK,
) {
  page.drawText(text, { x, y, size, font, color });
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });
}


export async function generatePayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const { height } = page.getSize();
  const margin = 40;
  const pageW = 595;
  const contentW = pageW - margin * 2;

  let y = height - margin;

  let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  try {
    const svgPath = path.join(process.cwd(), "public", "logo.svg");
    const svgBuffer = await fs.readFile(svgPath);
    const pngBuffer = await sharp(svgBuffer)
      .resize(50, 50, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    logoImage = await doc.embedPng(pngBuffer);
  } catch {
  }

  drawRect(page, 0, y - 70, pageW, 70, NAVY);

  if (logoImage) {
    page.drawImage(logoImage, { x: margin + 2, y: y - 60, width: 46, height: 46 });
  } else {
    drawRect(page, margin, y - 62, 52, 52, GOLD);
    drawText(page, "V", margin + 14, y - 42, bold, 28, WHITE);
  }

  const companyFullName = "Vaivamm Capital Advisors LLP";
  drawText(page, companyFullName, margin + 56, y - 20, bold, 14, WHITE);
  if (data.orgAddress) {
    drawText(page, data.orgAddress, margin + 56, y - 34, regular, 8, rgb(0.8, 0.85, 1));
  }

  const slipLabel = "Salary Slip";
  const slipW = bold.widthOfTextAtSize(slipLabel, 14);
  drawText(page, slipLabel, pageW - margin - slipW, y - 20, bold, 14, WHITE);
  const monthW = regular.widthOfTextAtSize(data.monthLabel, 9);
  drawText(page, `For: ${data.monthLabel}`, pageW - margin - monthW - 20, y - 34, regular, 9, rgb(0.8, 0.85, 1));

  y -= 70;

  drawRect(page, 0, y - 32, pageW, 32, NAVY);
  const empFields = [
    ["Employee", data.employeeName],
    ["ID", data.employeeId ?? "—"],
    ["Designation", data.designation ?? "—"],
    ["Department", data.department ?? "—"],
  ];
  let xOff = margin;
  for (const [label, value] of empFields) {
    drawText(page, label.toUpperCase(), xOff, y - 12, regular, 7, rgb(0.7, 0.75, 0.9));
    drawText(page, value, xOff, y - 24, bold, 9, WHITE);
    xOff += contentW / empFields.length;
  }
  y -= 32;

  drawRect(page, margin, y - 22, 44, 16, GREEN);
  drawText(page, "PAID", margin + 8, y - 17, bold, 9, WHITE);
  y -= 28;

  drawLine(page, margin, y, pageW - margin, y);
  y -= 10;

  const col1X = margin;
  const col2X = margin + contentW / 2 + 10;
  const colW = contentW / 2 - 10;
  let rowY = y;

  function drawSectionHeader(px: number, py: number, title: string): number {
    drawText(page, title, px, py, bold, 8, NAVY);
    drawLine(page, px, py - 4, px + colW, py - 4);
    return py - 16;
  }

  function drawRow(px: number, py: number, key: string, val: string): number {
    drawText(page, key, px, py, regular, 8, GRAY);
    const valW = regular.widthOfTextAtSize(val, 8);
    drawText(page, val, px + colW - valW, py, regular, 8, BLACK);
    return py - 14;
  }

  rowY = drawSectionHeader(col1X, rowY, "EMPLOYEE INFORMATION");
  rowY = drawRow(col1X, rowY, "Date of Joining", data.joiningDate ?? "—");
  rowY = drawRow(col1X, rowY, "PAN Number", data.panNumber ?? "—");
  if (data.pfUan) {
    rowY = drawRow(col1X, rowY, "PF UAN", data.pfUan);
  }

  let rowY2 = y;
  rowY2 = drawSectionHeader(col2X, rowY2, "PAYROLL INFORMATION");
  rowY2 = drawRow(col2X, rowY2, "Pay Period", data.monthLabel);
  rowY2 = drawRow(col2X, rowY2, "Payment Mode", "Bank Transfer");
  const calDays =
    data.calendarDaysInMonth != null ? String(data.calendarDaysInMonth) : "—";
  rowY2 = drawRow(col2X, rowY2, "Calendar Days", calDays);
  const daysWorked =
    data.effectiveDaysWorked != null ? String(data.effectiveDaysWorked) : "—";
  rowY2 = drawRow(col2X, rowY2, "Days worked", daysWorked);
  rowY2 = drawRow(
    col2X,
    rowY2,
    "LOP days",
    String(data.lopDays ?? 0)
  );
  rowY2 = drawRow(
    col2X,
    rowY2,
    "Half days",
    String(data.halfDays ?? 0)
  );

  y = Math.min(rowY, rowY2) - 10;
  drawLine(page, margin, y, pageW - margin, y);
  y -= 14;

  drawText(page, "SALARY BREAKDOWN", margin, y, bold, 8, NAVY);
  drawLine(page, margin, y - 4, pageW - margin, y - 4);
  y -= 18;

  const earningsW = contentW * 0.35;
  const amtW = contentW * 0.15;

  drawRect(page, margin, y - 4, contentW, 16, LIGHT_GRAY);
  drawText(page, "Earnings", margin + 4, y + 4, bold, 8, NAVY);
  drawText(page, "Amount", margin + earningsW + amtW - 4, y + 4, bold, 8, NAVY);
  drawText(page, "Deductions", margin + earningsW + amtW + 4, y + 4, bold, 8, NAVY);
  drawText(page, "Amount", margin + contentW - 4, y + 4, bold, 8, NAVY);
  y -= 18;

  let overtimeLabel = "Overtime Pay";
  if (data.overtimeAmount > 0) {
    if (data.overtimeType === "days") {
      overtimeLabel = `Overtime Pay (${data.overtimeDays ?? 0} days)`;
    } else if (data.overtimeType === "hours") {
      overtimeLabel = `Overtime Pay (${data.overtimeHours ?? 0} hours)`;
    }
  }

  const earningsRows: [string, number][] = [
    ["Basic Salary", data.basicSalary],
    ...(data.hra > 0 ? [["HRA", data.hra] as [string, number]] : []),
    ...(data.allowances > 0 ? [["Special Allowance", data.allowances] as [string, number]] : []),
    ...(data.overtimeAmount > 0 ? [[overtimeLabel, data.overtimeAmount] as [string, number]] : []),
  ];

  const professionalTax = data.professionalTax ?? 200;
  const otherDeductions = data.deductions - professionalTax;
  const deductionRows: [string, number][] = [];
  if (professionalTax > 0) {
    deductionRows.push(["Professional Tax", professionalTax]);
  }
  if (otherDeductions > 0) {
    deductionRows.push(["Other Deductions", otherDeductions]);
  }
  if (deductionRows.length === 0 && data.deductions > 0) {
    deductionRows.push(["Total Deductions", data.deductions]);
  }

  const maxRows = Math.max(earningsRows.length, deductionRows.length);

  for (let i = 0; i < maxRows; i++) {
    if (i < earningsRows.length) {
      const [label, amount] = earningsRows[i];
      drawText(page, label, margin + 4, y, regular, 8);
      if (amount > 0) {
        const aw = regular.widthOfTextAtSize(fmt(amount), 8);
        drawText(page, fmt(amount), margin + earningsW + amtW - 4 - aw, y, regular, 8);
      }
    }
    if (i < deductionRows.length) {
      const [label, amount] = deductionRows[i];
      drawText(page, label, margin + earningsW + amtW + 4, y, regular, 8);
      const dw = regular.widthOfTextAtSize(fmt(amount), 8);
      drawText(page, fmt(amount), margin + contentW - 4 - dw, y, regular, 8, RED);
    }
    y -= 14;
  }

  drawRect(page, margin, y - 4, contentW, 16, LIGHT_GRAY);
  drawText(page, "Gross Earnings", margin + 4, y + 4, bold, 8, NAVY);
  const gw = bold.widthOfTextAtSize(fmt(data.grossSalary), 8);
  drawText(page, fmt(data.grossSalary), margin + earningsW + amtW - 4 - gw, y + 4, bold, 8, NAVY);
  drawText(page, "Net Deductions", margin + earningsW + amtW + 4, y + 4, bold, 8, NAVY);
  const ndw = bold.widthOfTextAtSize(fmt(data.deductions), 8);
  drawText(page, fmt(data.deductions), margin + contentW - 4 - ndw, y + 4, bold, 8, RED);
  y -= 24;

  drawRect(page, 0, y - 28, pageW, 28, NAVY);
  drawText(page, "NET SALARY PAYABLE", margin, y - 18, bold, 10, WHITE);
  const netStr = fmt(data.netSalary);
  const nw = bold.widthOfTextAtSize(netStr, 14);
  drawText(page, netStr, pageW - margin - nw, y - 20, bold, 14, GOLD);
  y -= 28;

  drawRect(page, 0, y - 18, pageW, 18, LIGHT_GRAY);
  drawText(page, `In words: ${toWords(data.netSalary)}`, margin, y - 12, oblique, 8, GRAY);
  y -= 22;

  drawLine(page, margin, y, pageW - margin, y);
  y -= 14;

  let bankY = y;
  bankY = drawSectionHeader(col1X, bankY, "BANK DETAILS");
  bankY = drawRow(col1X, bankY, "Bank Name", data.bankName ?? "—");
  bankY = drawRow(col1X, bankY, "Account Number", data.maskedAccount ?? "—");
  bankY = drawRow(col1X, bankY, "IFSC Code", data.ifsc ?? "—");

  let authY = y;
  authY = drawSectionHeader(col2X, authY, "AUTHORISATION");
  authY -= 2;
  const authNote = "This is a system-generated payslip and does";
  const authNote2 = "not require a physical signature.";
  drawText(page, authNote, col2X, authY, regular, 7.5, GRAY);
  authY -= 12;
  drawText(page, authNote2, col2X, authY, regular, 7.5, GRAY);
  authY -= 20;
  drawLine(page, col2X, authY, col2X + colW, authY);
  drawText(page, "Authorised Signatory", col2X + colW / 2 - 35, authY - 10, regular, 8, GRAY);

  y = Math.min(bankY, authY) - 16;

  drawRect(page, 0, 0, pageW, 28, LIGHT_GRAY);
  const footerText = `Generated ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}  ·  Vaivamm Capital Advisors LLP  ·  Confidential — For Employee Use Only`;
  const fw = regular.widthOfTextAtSize(footerText, 7.5);
  drawText(page, footerText, pageW / 2 - fw / 2, 10, regular, 7.5, GRAY);
  void y;

  const bytes = await doc.save();
  const buffer = Buffer.from(bytes);
  if (data.password) {
    const result = await tryEncryptPdf(buffer, data.password);
    return result.buffer;
  }
  return buffer;
}

export async function generatePayslipPdfWithEncryptionStatus(
  data: PayslipPdfData
): Promise<{ buffer: Buffer; encrypted: boolean }> {
  const unencrypted = await generatePayslipPdf({ ...data, password: undefined });
  if (!data.password) return { buffer: unencrypted, encrypted: false };
  return tryEncryptPdf(unencrypted, data.password);
}
