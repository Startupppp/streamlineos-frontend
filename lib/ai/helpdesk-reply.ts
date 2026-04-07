import "server-only";

import { aiJSON, isOpenAIConfigured } from "./openai";
import { helpdeskReplyPrompt, type HelpdeskReplyInput, type HelpdeskReplyResult } from "./prompts";
import { db } from "@/lib/db";
import { helpdeskTickets, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

/** Generate a suggested reply for a helpdesk ticket. */
export async function aiSuggestHelpdeskReply(
  orgId: string,
  ticketId: number,
): Promise<HelpdeskReplyResult | null> {
  if (!isOpenAIConfigured()) {
    logger.warn("[ai-helpdesk] OpenAI not configured");
    return null;
  }

  const [ticket] = await db
    .select({
      title: helpdeskTickets.title,
      description: helpdeskTickets.description,
      category: helpdeskTickets.category,
      priority: helpdeskTickets.priority,
      userId: helpdeskTickets.userId,
      employeeName: users.name,
    })
    .from(helpdeskTickets)
    .leftJoin(users, eq(helpdeskTickets.userId, users.id))
    .where(and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.orgId, orgId)));

  if (!ticket) return null;

  const input: HelpdeskReplyInput = {
    ticketTitle: ticket.title,
    ticketDescription: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    employeeName: ticket.employeeName,
  };

  const prompt = helpdeskReplyPrompt(input);

  const result = await aiJSON<HelpdeskReplyResult>({
    model: "fast",
    system: prompt.system,
    user: prompt.user,
    maxTokens: 500,
  });

  return result;
}
