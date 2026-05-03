import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { completeAppraisalStage } from "@/lib/hr/appraisal-complete-stage";
import { completeStageSchema } from "@/lib/validations/hr-appraisals";
import type { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    const { id } = await params;
    const appraisalId = Number(id);
    if (!appraisalId) return err("Invalid id.", 400);
    const body = await parseBody(req, completeStageSchema);
    const result = await completeAppraisalStage({
      appraisalId,
      orgId: session.orgId,
      actorId: session.user.id,
      comment: body.comment,
    });
    if (!result.ok) return err(result.error, result.status);
    return ok({ success: true });
  });
}
