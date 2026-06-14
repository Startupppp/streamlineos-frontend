import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, tickets, workItemRelations } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

type RouteContext = { params: Promise<{ projectId: string }> };

interface CriticalPathNode {
  ticketId: number;
  title: string;
  estimate: number;
  earliestStart: number;
  earliestFinish: number;
}

interface TicketRow {
  id: number;
  title: string;
  storyPoints: number | null;
}

interface DagEdge {
  from: number;
  to: number;
}

function buildEdges(
  relations: { workItemId: number; relatedWorkItemId: number; relationType: string }[],
  validIds: Set<number>,
): DagEdge[] {
  const seen = new Set<string>();
  const edges: DagEdge[] = [];
  for (const rel of relations) {
    let from: number | null = null;
    let to: number | null = null;
    if (rel.relationType === "blocks") {
      from = rel.workItemId;
      to = rel.relatedWorkItemId;
    } else if (rel.relationType === "blocked_by") {
      from = rel.relatedWorkItemId;
      to = rel.workItemId;
    }
    if (from === null || to === null) continue;
    if (from === to) continue;
    if (!validIds.has(from) || !validIds.has(to)) continue;
    const key = `${from}->${to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ from, to });
  }
  return edges;
}

function computeCriticalPath(ticketRows: TicketRow[], edges: DagEdge[]) {
  const estimateById = new Map<number, number>();
  const titleById = new Map<number, string>();
  for (const t of ticketRows) {
    const estimate = t.storyPoints ?? 1;
    estimateById.set(t.id, estimate > 0 ? estimate : 1);
    titleById.set(t.id, t.title);
  }

  const adjacency = new Map<number, number[]>();
  const indegree = new Map<number, number>();
  for (const id of estimateById.keys()) {
    adjacency.set(id, []);
    indegree.set(id, 0);
  }
  for (const edge of edges) {
    adjacency.get(edge.from)!.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const queue: number[] = [];
  for (const [id, deg] of indegree) {
    if (deg === 0) queue.push(id);
  }

  const order: number[] = [];
  const workingIndegree = new Map(indegree);
  let head = 0;
  while (head < queue.length) {
    const node = queue[head];
    head += 1;
    order.push(node);
    for (const next of adjacency.get(node) ?? []) {
      const deg = (workingIndegree.get(next) ?? 0) - 1;
      workingIndegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  const hasCycle = order.length !== estimateById.size;

  const earliestFinish = new Map<number, number>();
  const earliestStart = new Map<number, number>();
  const predecessor = new Map<number, number | null>();
  for (const id of estimateById.keys()) {
    earliestStart.set(id, 0);
    earliestFinish.set(id, estimateById.get(id)!);
    predecessor.set(id, null);
  }

  for (const node of order) {
    const finish = earliestFinish.get(node)!;
    for (const next of adjacency.get(node) ?? []) {
      const candidateStart = finish;
      if (candidateStart > earliestStart.get(next)!) {
        earliestStart.set(next, candidateStart);
        earliestFinish.set(next, candidateStart + estimateById.get(next)!);
        predecessor.set(next, node);
      }
    }
  }

  let endNode: number | null = null;
  let maxFinish = -1;
  for (const node of order) {
    const finish = earliestFinish.get(node)!;
    if (finish > maxFinish) {
      maxFinish = finish;
      endNode = node;
    }
  }

  const chain: number[] = [];
  let cursor = endNode;
  const guard = new Set<number>();
  while (cursor !== null && cursor !== undefined && !guard.has(cursor)) {
    guard.add(cursor);
    chain.push(cursor);
    cursor = predecessor.get(cursor) ?? null;
  }
  chain.reverse();

  const criticalPath: CriticalPathNode[] = chain.map((id) => ({
    ticketId: id,
    title: titleById.get(id) ?? "",
    estimate: estimateById.get(id)!,
    earliestStart: earliestStart.get(id)!,
    earliestFinish: earliestFinish.get(id)!,
  }));

  return {
    criticalPath,
    totalDuration: criticalPath.length > 0 ? maxFinish : 0,
    hasCycle,
  };
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: idStr } = await ctx.params;
    const projectId = Number(idStr);
    if (!Number.isFinite(projectId)) return err("Invalid project ID", 400);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!project) return err("Project not found", 404);

    const ticketRows = await db
      .select({ id: tickets.id, title: tickets.title, storyPoints: tickets.storyPoints })
      .from(tickets)
      .where(and(eq(tickets.projectId, projectId), eq(tickets.orgId, session.orgId)));

    const ticketIds = ticketRows.map((t) => t.id);
    const validIds = new Set(ticketIds);

    if (ticketIds.length === 0) {
      return ok({
        criticalPath: [],
        totalDuration: 0,
        nodeCount: 0,
        edgeCount: 0,
        hasCycle: false,
      });
    }

    const relations = await db
      .select({
        workItemId: workItemRelations.workItemId,
        relatedWorkItemId: workItemRelations.relatedWorkItemId,
        relationType: workItemRelations.relationType,
      })
      .from(workItemRelations)
      .where(
        and(
          inArray(workItemRelations.workItemId, ticketIds),
          inArray(workItemRelations.relatedWorkItemId, ticketIds),
        ),
      );

    const edges = buildEdges(relations, validIds);

    if (edges.length === 0) {
      return ok({
        criticalPath: [],
        totalDuration: 0,
        nodeCount: ticketIds.length,
        edgeCount: 0,
        hasCycle: false,
      });
    }

    const { criticalPath, totalDuration, hasCycle } = computeCriticalPath(ticketRows, edges);

    return ok({
      criticalPath,
      totalDuration,
      nodeCount: ticketIds.length,
      edgeCount: edges.length,
      hasCycle,
    });
  });
}
