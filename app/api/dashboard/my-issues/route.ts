import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery } from "@/lib/api/helpers";
import { getMyIssues } from "@/server/queries/dashboard";
import { z } from "zod";

const schema = z.object({
  userId: z.string(),
  limit: z.coerce.number().default(20),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    let params: z.infer<typeof schema>;
    try {
      params = parseQuery(req, schema);
    } catch {
      return err("Invalid params: userId is required", 400);
    }
    try {
      const issues = await getMyIssues(session.orgId, params.userId);
      const mapped = issues.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status ?? "TODO",
        type: t.type ?? "TASK",
        priority: t.priority ?? "MEDIUM",
        ticketNumber: String(t.ticketNumber),
        updatedAt: t.updatedAt,
        projectName: t.project?.name ?? "",
        projectId: t.project?.id,
        projectKey: t.project?.key ?? "",
        assignee: t.assignee
          ? {
              id: t.assignee.id,
              firstName: t.assignee.firstName,
              lastName: t.assignee.lastName,
              image: t.assignee.image,
            }
          : null,
      }));
      return ok(mapped);
    } catch (error) {
      return err(error instanceof Error ? error.message : "Failed", 500);
    }
  });
}
