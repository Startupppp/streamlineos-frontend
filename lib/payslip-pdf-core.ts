import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import type { PayslipViewModel } from "@/lib/hr/payslip-view-model";
import { buildPayslipViewModelFromPayroll } from "@/lib/hr/payslip-view-model";
import { renderBrandedPayslipPdf } from "@/lib/hr/payslip-branded-pdf";

/**
 * Best-effort PDF encryption. pdf-lib does not natively support encryption,
 * so we rely on the `qpdf` system binary if it's installed (Vercel: not by
 * default; self-hosted: usually yes). If unavailable, returns the original
 * unencrypted buffer and logs a warning.
 */
async function tryEncryptPdf(buffer: Buffer, password: string): Promise<{ buffer: Buffer; encrypted: boolean }> {
  if (!password) return { buffer, encrypted: false };
  try {
    const { execFile } = await import("node:child_process");
    const os = await import("node:os");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);

    const unique = randomUUID();
    const tmpIn = path.join(os.tmpdir(), `payslip-in-${process.pid}-${unique}.pdf`);
    const tmpOut = path.join(os.tmpdir(), `payslip-out-${process.pid}-${unique}.pdf`);
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

export type PayslipPdfData = PayslipViewModel & {
  /** When set, qpdf encrypts the PDF if available. */
  password?: string;
};

export type BuildPayslipPdfOptions = {
  leaveDaysInMonth?: number;
  showPaidBadge?: boolean;
  orgFullNameOverride?: string;
};

type PayrollLike = Parameters<typeof buildPayslipViewModelFromPayroll>[0];
type UserLike = Parameters<typeof buildPayslipViewModelFromPayroll>[1];
type OrgLike = Parameters<typeof buildPayslipViewModelFromPayroll>[2];

/** Shared by mark-paid email and download?format=pdf */
export function buildPayslipPdfDataFromPayroll(
  payroll: PayrollLike,
  employee: UserLike,
  org: OrgLike,
  opts?: BuildPayslipPdfOptions
): PayslipPdfData {
  return buildPayslipViewModelFromPayroll(payroll, employee, org, {
    leaveDaysInMonth: opts?.leaveDaysInMonth,
    showPaidBadge: opts?.showPaidBadge,
    orgFullNameOverride: opts?.orgFullNameOverride,
  });
}

export async function generatePayslipPdf(data: PayslipPdfData): Promise<Buffer> {
  const { password, ...vm } = data;
  const buffer = await renderBrandedPayslipPdf(vm);
  if (password) {
    const result = await tryEncryptPdf(buffer, password);
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

// Re-export for consumers that only import types from payslip-pdf
export type { PayslipViewModel } from "@/lib/hr/payslip-view-model";
