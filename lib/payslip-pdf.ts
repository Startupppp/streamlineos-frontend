import "server-only";

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
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
  /** Optional. When set, the generated PDF is encrypted with this password if qpdf is available. */
  password?: string;
  bankName?: string;
  /** Full account number on payslip (HR template). */
  bankAccountDisplay?: string;
  ifsc?: string;
  /** Date of joining as dd-MM-yyyy */
  joiningDateDisplay?: string;
  monthLabel: string;
  basicSalary: number;
  hra: number;
  allowances: number;
  overtimeAmount: number;
  overtimeType?: string | null;
  overtimeDays?: number;
  overtimeHours?: number;
  calendarDaysInMonth?: number;
  effectiveDaysWorked?: number;
  lopDays?: number;
  halfDays?: number;
  /** Approved leave days (or fractional) in the pay month. */
  leaveDaysInMonth?: number;
  lopDeductionAmount?: number;
  advanceRecoveryAmount?: number;
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
  lopAmount?: string | null;
  advanceRecoveryAmount?: string | null;
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

export type BuildPayslipPdfOptions = {
  leaveDaysInMonth?: number;
};

/** Shared by mark-paid email and download?format=pdf */
export function buildPayslipPdfDataFromPayroll(
  payroll: PayrollLike,
  employee: UserLike,
  org: OrgLike,
  opts?: BuildPayslipPdfOptions
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
  const bankAccountDisplay = bank?.accountNumber ? String(bank.accountNumber).trim() : "—";

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
    bankName: bank?.bankName ?? undefined,
    bankAccountDisplay,
    ifsc: bank?.ifsc ?? undefined,
    joiningDateDisplay: employee.joiningDate
      ? format(new Date(employee.joiningDate), "dd-MM-yyyy")
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
    leaveDaysInMonth: opts?.leaveDaysInMonth ?? 0,
    lopDeductionAmount: parseFloat(payroll.lopAmount ?? "0"),
    advanceRecoveryAmount: parseFloat(payroll.advanceRecoveryAmount ?? "0"),
    grossSalary: parseFloat(payroll.grossSalary || "0"),
    deductions: parseFloat(payroll.deductions || "0"),
    professionalTax: parseFloat(payroll.ptAmount ?? "200"),
    netSalary: parseFloat(payroll.netSalary || "0"),
  };
}


const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.92, 0.92, 0.93);


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

function fmtRupees(n: number): string {
  const s = n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `₹${s}/-`;
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

export async function generatePayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const { height } = page.getSize();
  const margin = 48;
  const pageW = 595;
  const cw = pageW - margin * 2;
  let y = height - margin;

  const title = `PAYSLIP FOR THE MONTH OF ${data.monthLabel.toUpperCase()}`;
  const ts = 11;
  const tw = bold.widthOfTextAtSize(title, ts);
  const tx = margin + (cw - tw) / 2;
  drawText(page, title, tx, y, bold, ts, BLACK);
  page.drawLine({
    start: { x: tx, y: y - 3 },
    end: { x: tx + tw, y: y - 3 },
    thickness: 0.8,
    color: BLACK,
  });
  y -= 26;

  const mid = margin + cw / 2;
  const lh = 13;
  const pair = (ly: number, lk: string, lv: string, rk: string, rv: string) => {
    drawText(page, lk, margin, ly, regular, 9, GRAY);
    drawText(page, lv, margin + 118, ly, regular, 9, BLACK);
    drawText(page, rk, mid, ly, regular, 9, GRAY);
    drawText(page, rv, mid + 118, ly, regular, 9, BLACK);
  };

  let ry = y;
  pair(ry, "Employee Name:", data.employeeName, "Date of Joining:", data.joiningDateDisplay ?? "—");
  ry -= lh;
  const numDays =
    data.calendarDaysInMonth != null ? `${data.calendarDaysInMonth} Days` : "—";
  pair(ry, "Designation:", data.designation ?? "—", "No of Days:", numDays);
  ry -= lh;
  pair(ry, "EMP ID:", data.employeeId ?? "—", "PAN Number:", data.panNumber ?? "—");
  ry -= lh;
  pair(ry, "Bank Name:", data.bankName ?? "—", "LOP:", String(data.lopDays ?? 0));
  ry -= lh;
  pair(
    ry,
    "Bank Acc Number:",
    data.bankAccountDisplay ?? "—",
    "Leaves:",
    String(data.leaveDaysInMonth ?? 0)
  );
  ry -= lh;
  y = ry - 14;

  const tableW = cw;
  const split2 = margin + tableW * 0.52;
  const rowH = 15;

  const drawHeaderRow = () => {
    drawRect(page, margin, y - rowH, tableW, rowH, LIGHT_GRAY);
    drawText(page, "Earnings", margin + 4, y - rowH + 4, bold, 8, BLACK);
    drawText(page, "Amount", split2 - 4 - bold.widthOfTextAtSize("Amount", 8), y - rowH + 4, bold, 8, BLACK);
    drawText(page, "Deductions", split2 + 4, y - rowH + 4, bold, 8, BLACK);
    drawText(
      page,
      "Amount",
      margin + tableW - 4 - bold.widthOfTextAtSize("Amount", 8),
      y - rowH + 4,
      bold,
      8,
      BLACK
    );
    y -= rowH;
  };

  drawHeaderRow();

  const specAllow = Math.max(0, data.allowances);
  const earnLines: [string, number][] = [
    ["Basic Pay", data.basicSalary],
    ["House Rent Allowance", data.hra],
    ["Special Allowance", specAllow],
  ];
  if (data.overtimeAmount > 0) {
    let otLabel = "Overtime";
    if (data.overtimeType === "days") {
      otLabel = `Overtime (${data.overtimeDays ?? 0} days)`;
    } else if (data.overtimeType === "hours") {
      otLabel = `Overtime (${data.overtimeHours ?? 0} hours)`;
    }
    earnLines.push([otLabel, data.overtimeAmount]);
  }
  earnLines.push(["Total Earnings", data.grossSalary]);

  const pt = data.professionalTax ?? 0;
  const dedLines: [string, number][] = [];
  if (pt > 0) dedLines.push(["Professional Tax", pt]);
  const lopD = data.lopDeductionAmount ?? 0;
  if (lopD > 0) dedLines.push(["Loss of Pay", lopD]);
  const adv = data.advanceRecoveryAmount ?? 0;
  if (adv > 0) dedLines.push(["Advance Recovery", adv]);
  const otherDed = Math.max(0, data.deductions - pt - lopD - adv);
  if (otherDed > 0.5) dedLines.push(["Other deductions", otherDed]);
  dedLines.push(["Total Deductions", data.deductions]);

  const n = Math.max(earnLines.length, dedLines.length);
  for (let i = 0; i < n; i++) {
    const el = earnLines[i];
    const dl = dedLines[i];
    if (el) {
      drawText(page, el[0], margin + 4, y - rowH + 4, el[0].startsWith("Total") ? bold : regular, 8, BLACK);
      const amt = fmtRupees(el[1]);
      drawText(page, amt, split2 - 4 - regular.widthOfTextAtSize(amt, 8), y - rowH + 4, el[0].startsWith("Total") ? bold : regular, 8, BLACK);
    }
    if (dl) {
      drawText(page, dl[0], split2 + 4, y - rowH + 4, dl[0].startsWith("Total") ? bold : regular, 8, BLACK);
      const amt = fmtRupees(dl[1]);
      drawText(
        page,
        amt,
        margin + tableW - 4 - regular.widthOfTextAtSize(amt, 8),
        y - rowH + 4,
        dl[0].startsWith("Total") ? bold : regular,
        8,
        BLACK
      );
    }
    y -= rowH;
  }

  drawRect(page, margin, y - rowH, tableW, rowH, LIGHT_GRAY);
  const netLabel = "Net Salary";
  const netStr = fmtRupees(data.netSalary);
  drawText(page, netLabel, margin + 4, y - rowH + 4, bold, 9, BLACK);
  drawText(page, netStr, margin + tableW - 4 - bold.widthOfTextAtSize(netStr, 9), y - rowH + 4, bold, 9, BLACK);
  y -= rowH + 10;

  const words = `In Words: ${toWords(data.netSalary)}`;
  drawText(page, words, margin, y, oblique, 9, BLACK);
  y -= 20;

  const note =
    "This is a system-generated Pay slip and does not require a physical signature";
  drawText(page, note, margin, y, regular, 8, GRAY);
  y -= 28;

  const footer = `${data.orgName} · Generated ${format(new Date(), "dd MMM yyyy HH:mm")}`;
  const fw = regular.widthOfTextAtSize(footer, 7.5);
  drawText(page, footer, margin + (cw - fw) / 2, 36, regular, 7.5, GRAY);

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
