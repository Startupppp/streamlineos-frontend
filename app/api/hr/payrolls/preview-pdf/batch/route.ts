import { withAdmin, parseBody, err } from "@/lib/api/helpers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import JSZip from "jszip";
import { manualPayslipBodyToPdfData, manualPayslipPdfBodySchema } from "@/lib/hr/manual-payslip-pdf";
import { generatePayslipPdf } from "@/lib/payslip-pdf";

const batchSchema = z.object({
  slips: z.array(manualPayslipPdfBodySchema).min(1).max(50),
});

/**
 * POST { slips: ManualPayslipPdfBody[] } → application/zip of PDFs (branded layout).
 * CEO / HR / ADMIN only. Max 50 slips per request.
 */
export async function POST(req: NextRequest) {
  return withAdmin(async () => {
    const body = await parseBody(req, batchSchema);
    if (body.slips.some((s) => s.encrypt)) {
      return err(
        "Batch export is unencrypted only. Remove encrypt from each slip, or call POST /api/hr/payrolls/preview-pdf per employee for password-protected PDFs.",
        400
      );
    }

    const zip = new JSZip();
    for (let i = 0; i < body.slips.length; i++) {
      const slip = body.slips[i];
      const data = manualPayslipBodyToPdfData({ ...slip, encrypt: false, password: undefined });
      const buf = await generatePayslipPdf({ ...data, password: undefined });
      const monthPart = slip.month ?? "custom";
      const safe = slip.employeeName.replace(/\s+/g, "-");
      zip.file(`Payslip-${safe}-${monthPart}-${i + 1}.pdf`, buf);
    }

    const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
    return new NextResponse(new Uint8Array(zipBuf), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="payslips-batch.zip"',
      },
    });
  });
}
