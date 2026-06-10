import "server-only";
import { desc, eq, ilike, or, and, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformMessages, type PlatformMessageStatus } from "@/lib/db/schema";

export type InboxFilter = {
  status?: PlatformMessageStatus | "ALL";
  topic?: string;
  search?: string;
};

export async function listMessages(filter: InboxFilter = {}) {
  const conditions: SQL[] = [];
  if (filter.status && filter.status !== "ALL") {
    conditions.push(eq(platformMessages.status, filter.status));
  }
  if (filter.topic && filter.topic !== "ALL") {
    conditions.push(eq(platformMessages.topic, filter.topic));
  }
  if (filter.search) {
    const q = `%${filter.search}%`;
    const searchCondition = or(
      ilike(platformMessages.name, q),
      ilike(platformMessages.email, q),
      ilike(platformMessages.company, q),
      ilike(platformMessages.message, q),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  return db.query.platformMessages.findMany({
    where: conditions.length === 0 ? undefined : and(...conditions),
    orderBy: desc(platformMessages.createdAt),
    limit: 200,
  });
}

export async function getMessageByPublicCode(code: string) {
  return db.query.platformMessages.findFirst({
    where: eq(platformMessages.publicCode, code),
  });
}
