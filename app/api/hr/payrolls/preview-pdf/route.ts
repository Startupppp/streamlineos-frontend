import { withAdmin, err, parseBody } from "@/lib/api/helpers";
import { generatePayslipPdfWithEncryptionStatus } from "@/lib/payslip-pdf";
import { manualPayslipBodyToPdfData, manualPayslipPdfBodySchema } from "@/lib/hr/manual-payslip-pdf";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * POST JSON payslip fields → application/pdf (no DB write).
 * Admin (CEO / HR / ADMIN) only.
 */
export async function POST(req: NextRequest) {
  return withAdmin(async () => {
    const body = await parseBody(req, manualPayslipPdfBodySchema);
    const pdfData = manualPayslipBodyToPdfData(body);
    const { buffer, encrypted } = await generatePayslipPdfWithEncryptionStatus(pdfData);

    if (body.encrypt && body.password && !encrypted) {
      return err(
        "PDF encryption requested but qpdf is not available on this server. Omit encrypt or install qpdf.",
        503
      );
    }

    const safeName = body.employeeName.replace(/\s+/g, "-");
    const monthPart = body.month ?? "custom";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Payslip-${safeName}-${monthPart}.pdf"`,
      },
    });
  });
}
