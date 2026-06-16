import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gitConnections } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import {
  verifyGithubSignature,
  verifyGitlabToken,
  extractTicketRefs,
  resolveTicketsByRef,
  recordLinks,
  type GitLinkInput,
  type GitProvider,
  type GitRefType,
} from "@/lib/services/git-integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParsedRef {
  refType: GitRefType;
  externalId: string;
  title: string | null;
  url: string | null;
  author: string | null;
  status: string | null;
  text: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) return value as Record<string, unknown>;
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseGithubPush(body: Record<string, unknown>): ParsedRef[] {
  const commits = Array.isArray(body.commits) ? body.commits : [];
  const refs: ParsedRef[] = [];
  for (const raw of commits) {
    const commit = asRecord(raw);
    if (!commit) continue;
    const id = asString(commit.id);
    if (!id) continue;
    const message = asString(commit.message) ?? "";
    const author = asRecord(commit.author);
    refs.push({
      refType: "commit",
      externalId: id,
      title: message.split("\n")[0]?.slice(0, 300) || id.slice(0, 12),
      url: asString(commit.url),
      author: author ? asString(author.name) : null,
      status: null,
      text: message,
    });
  }
  return refs;
}

function parseGithubPullRequest(body: Record<string, unknown>): ParsedRef[] {
  const pr = asRecord(body.pull_request);
  if (!pr) return [];
  const number = typeof pr.number === "number" ? pr.number : null;
  if (number === null) return [];
  const title = asString(pr.title) ?? `PR #${number}`;
  const prBody = asString(pr.body) ?? "";
  const user = asRecord(pr.user);
  const action = asString(body.action);
  const merged = pr.merged === true;
  const status = merged ? "merged" : asString(pr.state) ?? action;
  return [{
    refType: "pull_request",
    externalId: String(number),
    title: title.slice(0, 300),
    url: asString(pr.html_url),
    author: user ? asString(user.login) : null,
    status,
    text: `${title}\n${prBody}`,
  }];
}

function parseGitlabPush(body: Record<string, unknown>): ParsedRef[] {
  const commits = Array.isArray(body.commits) ? body.commits : [];
  const refs: ParsedRef[] = [];
  for (const raw of commits) {
    const commit = asRecord(raw);
    if (!commit) continue;
    const id = asString(commit.id);
    if (!id) continue;
    const message = asString(commit.message) ?? "";
    const author = asRecord(commit.author);
    refs.push({
      refType: "commit",
      externalId: id,
      title: message.split("\n")[0]?.slice(0, 300) || id.slice(0, 12),
      url: asString(commit.url),
      author: author ? asString(author.name) : null,
      status: null,
      text: message,
    });
  }
  return refs;
}

function parseGitlabMergeRequest(body: Record<string, unknown>): ParsedRef[] {
  const attrs = asRecord(body.object_attributes);
  if (!attrs) return [];
  const iid = typeof attrs.iid === "number" ? attrs.iid : null;
  if (iid === null) return [];
  const title = asString(attrs.title) ?? `MR !${iid}`;
  const description = asString(attrs.description) ?? "";
  const user = asRecord(body.user);
  return [{
    refType: "pull_request",
    externalId: String(iid),
    title: title.slice(0, 300),
    url: asString(attrs.url),
    author: user ? asString(user.username) : null,
    status: asString(attrs.state),
    text: `${title}\n${description}`,
  }];
}

function parseEvent(provider: GitProvider, eventType: string | null, body: Record<string, unknown>): ParsedRef[] {
  if (provider === "github") {
    if (eventType === "push") return parseGithubPush(body);
    if (eventType === "pull_request") return parseGithubPullRequest(body);
    return [];
  }
  if (provider === "gitlab") {
    if (eventType === "Push Hook" || eventType === "Tag Push Hook") return parseGitlabPush(body);
    if (eventType === "Merge Request Hook") return parseGitlabMergeRequest(body);
    return [];
  }
  return [];
}

function verifySignature(
  provider: GitProvider,
  secret: string,
  rawBody: string,
  req: NextRequest,
): boolean {
  if (provider === "gitlab") {
    return verifyGitlabToken(secret, req.headers.get("x-gitlab-token"));
  }
  return verifyGithubSignature(secret, rawBody, req.headers.get("x-hub-signature-256"));
}

function eventHeader(provider: GitProvider, req: NextRequest): string | null {
  if (provider === "gitlab") return req.headers.get("x-gitlab-event");
  return req.headers.get("x-github-event");
}

export async function POST(req: NextRequest) {
  const ack = NextResponse.json({ ok: true });
  try {
    const connectionIdRaw = req.nextUrl.searchParams.get("connectionId");
    const connectionId = Number(connectionIdRaw);
    if (!Number.isFinite(connectionId)) return ack;

    const rawBody = await req.text();

    const connection = await db.query.gitConnections.findFirst({
      where: eq(gitConnections.id, connectionId),
    });
    if (!connection || !connection.isActive) return ack;

    const provider = connection.provider;
    if (!verifySignature(provider, connection.webhookSecret, rawBody, req)) {
      logger.warn("[git-webhook] signature verification failed", { connectionId });
      return ack;
    }

    let body: Record<string, unknown> | null;
    try {
      const parsed: unknown = JSON.parse(rawBody);
      body = asRecord(parsed);
    } catch {
      return ack;
    }
    if (!body) return ack;

    const eventType = eventHeader(provider, req);
    const parsedRefs = parseEvent(provider, eventType, body);
    if (parsedRefs.length === 0) return ack;

    const links: GitLinkInput[] = [];
    for (const parsed of parsedRefs) {
      const ticketRefs = extractTicketRefs(parsed.text);
      if (ticketRefs.length === 0) continue;
      const resolved = await resolveTicketsByRef(connection.orgId, ticketRefs);
      for (const { ticketId } of resolved) {
        links.push({
          orgId: connection.orgId,
          ticketId,
          connectionId: connection.id,
          provider,
          refType: parsed.refType,
          externalId: parsed.externalId,
          title: parsed.title,
          url: parsed.url,
          author: parsed.author,
          status: parsed.status,
        });
      }
    }

    if (links.length > 0) {
      await recordLinks(links);
    }

    return ack;
  } catch (error) {
    logger.error("[git-webhook] unexpected error", { error });
    return ack;
  }
}
