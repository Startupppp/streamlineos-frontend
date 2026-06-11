import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { cached, invalidateCachePattern, CACHE_TTL } from "@/lib/cache";
import { getSessionAbility } from "@/lib/abilities-server";
import { createAuditLog } from "@/lib/audit-log";
import {
  listProjects,
  listProjectsSchema,
  createProject,
  createProjectSchema,
} from "@/lib/services/projects";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const input = parseQuery(req, listProjectsSchema);

    const ability = await getSessionAbility();
    const isOwnerOrAdmin = ability.can("manage", "projects");
    const orgId = session.orgId;
    const userId = session.user.id;

    const key = `projects:list:${orgId}:${userId}:${isOwnerOrAdmin ? "all" : "scoped"}:${input.status}:${input.search ?? ""}:${input.page}:${input.limit}`;
    const result = await cached(
      key,
      () => listProjects(orgId, userId, isOwnerOrAdmin, input),
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    return ok(result);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const input = await parseBody(req, createProjectSchema);
    const { project, key } = await createProject(session.orgId, session.user.id, input);

    void createAuditLog({
      action: "project.created",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(project.id),
      targetType: "project",
      metadata: { name: input.name, key, managerId: input.managerId },
    }).catch(() => {});

    await invalidateCachePattern(`projects:list:${session.orgId}:*`);

    return ok(project, 201);
  });
}
