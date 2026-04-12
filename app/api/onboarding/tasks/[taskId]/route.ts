import { type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { onboardingTasks } from "@/lib/db/schema";

const patchSchema = z.object({
  status: z.enum(["COMPLETED", "PENDING"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return withAuth(async (session) => {
    const { taskId } = await params;
    const taskIdNum = Number(taskId);
    if (!Number.isFinite(taskIdNum)) {
      return err("Invalid task ID", 400);
    }

    const body = await parseBody(req, patchSchema);

    // Load the task to verify ownership / org membership
    const [task] = await db
      .select()
      .from(onboardingTasks)
      .where(and(eq(onboardingTasks.id, taskIdNum), eq(onboardingTasks.orgId, session.orgId)));

    if (!task) {
      return err("Task not found", 404);
    }

    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN" || role === "MANAGER";

    if (!isAdmin && task.userId !== session.user.id) {
      return err("Forbidden", 403);
    }

    const now = new Date();
    await db
      .update(onboardingTasks)
      .set({
        status: body.status,
        completedAt: body.status === "COMPLETED" ? now : null,
        completedBy: body.status === "COMPLETED" ? session.user.id : null,
      })
      .where(eq(onboardingTasks.id, taskIdNum));

    return ok({ success: true });
  });
}
