import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { ticketActivityLog, ticketCommentMentions } from "@/lib/db/schema/projects/activity";
import { createNotification } from "@/server/actions/create-notification";
import { logger } from "@/lib/logger";

export type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TicketActivityAction =
  (typeof ticketActivityLog.action.enumValues)[number];

interface LogTicketActivityInput {
  orgId: string;
  ticketId: number;
  userId: string | null;
  action: TicketActivityAction;
  fromValue?: string | null;
  toValue?: string | null;
}

export async function logTicketActivity(
  executor: DbOrTx,
  input: LogTicketActivityInput,
): Promise<void> {
  await executor.insert(ticketActivityLog).values({
    orgId: input.orgId,
    ticketId: input.ticketId,
    userId: input.userId ?? null,
    action: input.action,
    fromValue: input.fromValue ?? null,
    toValue: input.toValue ?? null,
  });
}

interface TicketSnapshot {
  title: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  sprintId: number | null;
  dueDate: string | null;
}

interface TicketChanges {
  title?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  sprintId?: number | null;
  dueDate?: string | null;
}

function normalize(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

export async function logTicketFieldChanges(
  executor: DbOrTx,
  orgId: string,
  ticketId: number,
  userId: string,
  before: TicketSnapshot,
  changes: TicketChanges,
): Promise<void> {
  const entries: Array<{
    action: TicketActivityAction;
    from: string | null;
    to: string | null;
  }> = [];

  if (changes.title !== undefined && normalize(changes.title) !== normalize(before.title)) {
    entries.push({ action: "title_changed", from: normalize(before.title), to: normalize(changes.title) });
  }
  if (changes.status !== undefined && normalize(changes.status) !== normalize(before.status)) {
    entries.push({ action: "status_changed", from: normalize(before.status), to: normalize(changes.status) });
  }
  if (changes.priority !== undefined && normalize(changes.priority) !== normalize(before.priority)) {
    entries.push({ action: "priority_changed", from: normalize(before.priority), to: normalize(changes.priority) });
  }
  if (changes.assigneeId !== undefined && normalize(changes.assigneeId) !== normalize(before.assigneeId)) {
    const ids = [before.assigneeId, changes.assigneeId].filter((id): id is string => !!id);
    const nameById = await resolveUserNames(executor, ids);
    entries.push({
      action: "assignee_changed",
      from: before.assigneeId ? nameById.get(before.assigneeId) ?? before.assigneeId : null,
      to: changes.assigneeId ? nameById.get(changes.assigneeId) ?? changes.assigneeId : null,
    });
  }
  if (changes.sprintId !== undefined && normalize(changes.sprintId) !== normalize(before.sprintId)) {
    entries.push({ action: "sprint_changed", from: normalize(before.sprintId), to: normalize(changes.sprintId) });
  }
  if (changes.dueDate !== undefined && normalize(changes.dueDate) !== normalize(before.dueDate)) {
    entries.push({ action: "due_date_changed", from: normalize(before.dueDate), to: normalize(changes.dueDate) });
  }

  for (const entry of entries) {
    await logTicketActivity(executor, {
      orgId,
      ticketId,
      userId,
      action: entry.action,
      fromValue: entry.from,
      toValue: entry.to,
    });
  }
}

async function resolveUserNames(
  executor: DbOrTx,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return map;

  const rows = await executor
    .select({ id: users.id, name: users.name, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(inArray(users.id, unique));

  for (const row of rows) {
    map.set(row.id, displayName(row));
  }
  return map;
}

function displayName(user: {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  if (user.name && user.name.trim()) return user.name.trim();
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (full) return full;
  return user.email ?? "Unknown";
}

interface OrgUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

function extractMentionTokens(content: string): string[] {
  const matches = content.match(/@([\w.+-]+(?:\s+[\w.+-]+)?)/g);
  if (!matches) return [];
  return matches.map((token) => token.slice(1).trim().toLowerCase()).filter(Boolean);
}

function matchMentionedUsers(content: string, orgUsers: OrgUser[]): OrgUser[] {
  const tokens = extractMentionTokens(content);
  if (tokens.length === 0) return [];

  const matched = new Map<string, OrgUser>();
  for (const user of orgUsers) {
    const candidates = [
      user.email.toLowerCase(),
      user.email.split("@")[0]?.toLowerCase() ?? "",
      displayName(user).toLowerCase(),
      `${user.firstName ?? ""}`.toLowerCase().trim(),
    ].filter(Boolean);

    if (tokens.some((token) => candidates.includes(token))) {
      matched.set(user.id, user);
    }
  }
  return Array.from(matched.values());
}

interface ProcessMentionsInput {
  orgId: string;
  ticketId: number;
  ticketTitle: string;
  projectId: number | null;
  commentId: number;
  content: string;
  authorId: string;
  authorName: string;
}

export async function processCommentMentions(input: ProcessMentionsInput): Promise<void> {
  if (!input.content || !input.content.includes("@")) return;

  const orgUsers = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.orgId, input.orgId));

  const mentioned = matchMentionedUsers(input.content, orgUsers).filter(
    (user) => user.id !== input.authorId,
  );
  if (mentioned.length === 0) return;

  try {
    await db
      .insert(ticketCommentMentions)
      .values(
        mentioned.map((user) => ({
          orgId: input.orgId,
          commentId: input.commentId,
          mentionedUserId: user.id,
        })),
      )
      .onConflictDoNothing();
  } catch (error) {
    logger.error("Failed to insert ticket comment mentions", { error });
    return;
  }

  const link = input.projectId ? `/projects/${input.projectId}` : undefined;
  for (const user of mentioned) {
    try {
      await createNotification({
        orgId: input.orgId,
        userId: user.id,
        type: "INFO",
        title: "You were mentioned",
        message: `${input.authorName} mentioned you in a comment on "${input.ticketTitle}".`,
        link,
        metadata: { ticketId: input.ticketId, commentId: input.commentId },
      });
    } catch (error) {
      logger.error("Failed to notify mentioned user", { error });
    }
  }
}
