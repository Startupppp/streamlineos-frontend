import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { tickets, gitTicketLinks } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export type GitProvider = "github" | "gitlab" | "bitbucket";
export type GitRefType = "commit" | "pull_request" | "branch";

export interface ParsedTicketRef {
  projectKey: string | null;
  ticketNumber: number;
}

export interface ResolvedTicket {
  ref: ParsedTicketRef;
  ticketId: number;
}

export interface GitLinkInput {
  orgId: string;
  ticketId: number;
  connectionId: number | null;
  provider: GitProvider;
  refType: GitRefType;
  externalId: string;
  title?: string | null;
  url?: string | null;
  author?: string | null;
  status?: string | null;
}

const KEYED_REF_PATTERN = /\b([A-Z][A-Z0-9]+-\d{1,3})-(\d+)\b/g;
const BARE_REF_PATTERN = /(?<![A-Za-z0-9])#(\d+)\b/g;

export function verifyGithubSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null | undefined,
): boolean {
  if (!secret || !signatureHeader) return false;
  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return false;
  const provided = signatureHeader.slice(prefix.length);
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function verifyGitlabToken(
  secret: string,
  tokenHeader: string | null | undefined,
): boolean {
  if (!secret || !tokenHeader) return false;
  const a = Buffer.from(secret, "utf8");
  const b = Buffer.from(tokenHeader, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function extractTicketRefs(text: string | null | undefined): ParsedTicketRef[] {
  if (!text) return [];
  const seen = new Set<string>();
  const refs: ParsedTicketRef[] = [];

  for (const match of text.matchAll(KEYED_REF_PATTERN)) {
    const projectKey = match[1];
    const ticketNumber = Number(match[2]);
    if (!Number.isFinite(ticketNumber)) continue;
    const dedupeKey = `${projectKey}#${ticketNumber}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    refs.push({ projectKey, ticketNumber });
  }

  for (const match of text.matchAll(BARE_REF_PATTERN)) {
    const ticketNumber = Number(match[1]);
    if (!Number.isFinite(ticketNumber)) continue;
    const dedupeKey = `*#${ticketNumber}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    refs.push({ projectKey: null, ticketNumber });
  }

  return refs;
}

export async function resolveTicketsByRef(
  orgId: string,
  refs: ParsedTicketRef[],
): Promise<ResolvedTicket[]> {
  if (refs.length === 0) return [];

  const keyedRefs = refs.filter((r): r is ParsedTicketRef & { projectKey: string } => r.projectKey !== null);
  const bareRefs = refs.filter((r) => r.projectKey === null);
  const resolved: ResolvedTicket[] = [];

  if (keyedRefs.length > 0) {
    const projectKeys = Array.from(new Set(keyedRefs.map((r) => r.projectKey)));
    const projectRows = await db
      .select({ id: projects.id, key: projects.key })
      .from(projects)
      .where(and(eq(projects.orgId, orgId), inArray(projects.key, projectKeys)));

    const keyToProjectId = new Map(projectRows.map((p) => [p.key, p.id]));
    const projectIds = projectRows.map((p) => p.id);

    if (projectIds.length > 0) {
      const ticketRows = await db
        .select({ id: tickets.id, projectId: tickets.projectId, ticketNumber: tickets.ticketNumber })
        .from(tickets)
        .where(and(eq(tickets.orgId, orgId), inArray(tickets.projectId, projectIds)));

      const ticketLookup = new Map<string, number>();
      for (const t of ticketRows) {
        if (t.projectId === null) continue;
        ticketLookup.set(`${t.projectId}#${t.ticketNumber}`, t.id);
      }

      for (const ref of keyedRefs) {
        const projectId = keyToProjectId.get(ref.projectKey);
        if (projectId === undefined) continue;
        const ticketId = ticketLookup.get(`${projectId}#${ref.ticketNumber}`);
        if (ticketId === undefined) continue;
        resolved.push({ ref, ticketId });
      }
    }
  }

  if (bareRefs.length > 0) {
    const numbers = Array.from(new Set(bareRefs.map((r) => r.ticketNumber)));
    const ticketRows = await db
      .select({ id: tickets.id, ticketNumber: tickets.ticketNumber })
      .from(tickets)
      .where(and(eq(tickets.orgId, orgId), inArray(tickets.ticketNumber, numbers)));

    const numberToTicketIds = new Map<number, number[]>();
    for (const t of ticketRows) {
      const existing = numberToTicketIds.get(t.ticketNumber) ?? [];
      existing.push(t.id);
      numberToTicketIds.set(t.ticketNumber, existing);
    }

    for (const ref of bareRefs) {
      const candidates = numberToTicketIds.get(ref.ticketNumber) ?? [];
      if (candidates.length !== 1) continue;
      resolved.push({ ref, ticketId: candidates[0] });
    }
  }

  return resolved;
}

export async function recordLinks(links: GitLinkInput[]): Promise<number> {
  if (links.length === 0) return 0;

  const values = links.map((link) => ({
    orgId: link.orgId,
    ticketId: link.ticketId,
    connectionId: link.connectionId,
    provider: link.provider,
    refType: link.refType,
    externalId: link.externalId,
    title: link.title ?? null,
    url: link.url ?? null,
    author: link.author ?? null,
    status: link.status ?? null,
  }));

  try {
    const inserted = await db
      .insert(gitTicketLinks)
      .values(values)
      .onConflictDoNothing({
        target: [gitTicketLinks.ticketId, gitTicketLinks.refType, gitTicketLinks.externalId],
      })
      .returning({ id: gitTicketLinks.id });
    return inserted.length;
  } catch (error) {
    logger.error("[git-integration] failed to record links", { error });
    return 0;
  }
}
