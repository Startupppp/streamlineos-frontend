import { z } from "zod";

/**
 * Response contracts for the mail module.
 * Derived from backend `mail-response.schemas.ts`.
 * NOT `.strict()`.
 */

const mailAddressContract = z.object({
  name: z.string().nullable(),
  email: z.string(),
});

const mailAttachmentContract = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nullable(),
});

/** `mailAccountSchema` */
export const mailAccountContract = z.object({
  id: z.number().int(),
  provider: z.string(),
  accountEmail: z.string().nullable(),
  accountLabel: z.string().nullable(),
  status: z.enum(["active", "needs_reauth", "disabled"]),
  isPrimary: z.boolean(),
  composioConnectedAccountId: z.string(),
});

/** `mailAccountListSchema` */
export const mailAccountListContract = z.array(mailAccountContract);

const mailAccountErrorContract = z.object({
  accountId: z.number().int(),
  accountEmail: z.string().nullable(),
  message: z.string(),
});

/** `mailListResponseSchema` */
export const mailListResponseContract = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      threadId: z.string(),
      accountId: z.number().int(),
      provider: z.string(),
      from: mailAddressContract,
      to: z.array(mailAddressContract),
      subject: z.string(),
      snippet: z.string(),
      date: z.string(),
      isRead: z.boolean(),
      isStarred: z.boolean(),
      hasAttachments: z.boolean(),
    }),
  ),
  nextCursor: z.string().nullable(),
  accountErrors: z.array(mailAccountErrorContract),
});

const mailMessageDetailContract = z.object({
  id: z.string(),
  threadId: z.string(),
  accountId: z.number().int(),
  provider: z.string(),
  from: mailAddressContract,
  to: z.array(mailAddressContract),
  subject: z.string(),
  snippet: z.string(),
  date: z.string(),
  isRead: z.boolean(),
  isStarred: z.boolean(),
  hasAttachments: z.boolean(),
  cc: z.array(mailAddressContract),
  bodyHtml: z.string().nullable(),
  bodyText: z.string().nullable(),
  attachments: z.array(mailAttachmentContract),
});

/** `mailThreadSchema` — array of detail messages. */
export const mailThreadContract = z.array(mailMessageDetailContract);

/** `mailMessageSchema` — single message detail. */
export const mailMessageContract = mailMessageDetailContract;

/** `mailDownloadSchema` */
export const mailDownloadContract = z.object({
  downloadUrl: z.string(),
  fileName: z.string(),
});

/** `mailAiInboxSummarySchema` */
export const mailAiInboxSummaryContract = z.object({
  summary: z.string(),
  highlights: z.array(
    z.object({
      subject: z.string(),
      fromEmail: z.string(),
      reason: z.string(),
    }),
  ),
  actionItems: z.array(z.string()),
  aiUsage: z
    .object({ inputTokens: z.number().int(), outputTokens: z.number().int() })
    .optional(),
});

/** `mailAiThreadSummarySchema` */
export const mailAiThreadSummaryContract = z.object({
  summary: z.string(),
  actionItems: z.array(z.string()),
  suggestedReply: z.string(),
  aiUsage: z
    .object({ inputTokens: z.number().int(), outputTokens: z.number().int() })
    .optional(),
});

/** `mailAiDraftSchema` */
export const mailAiDraftContract = z.object({
  subject: z.string(),
  bodyHtml: z.string(),
  aiUsage: z
    .object({ inputTokens: z.number().int(), outputTokens: z.number().int() })
    .optional(),
});
