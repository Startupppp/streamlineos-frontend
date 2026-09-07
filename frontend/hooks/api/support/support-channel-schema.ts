import { z } from "zod";

const supportChannelRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  type: z.enum(["email", "chat", "whatsapp", "sms"]),
  name: z.string(),
  config: z.record(z.string(), z.unknown()).nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const supportChannelListContract = z.array(supportChannelRowContract);
export const supportChannelContract = supportChannelRowContract;

const chatSessionMessageContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  ticketId: z.number().int(),
  authorId: z.string().nullable(),
  body: z.string(),
  isInternal: z.boolean(),
  sourceChannel: z.string(),
  sourceMessageId: z.string().nullable(),
  sourceContactEmail: z.string().nullable(),
  sourceContactName: z.string().nullable(),
  createdAt: z.string(),
});

export const startChatSessionContract = z.object({
  ticketId: z.number().int(),
  sessionToken: z.string(),
});

export const getChatSessionContract = z.object({
  ticketId: z.number().int(),
  messages: z.array(chatSessionMessageContract),
});

export const sendChatMessageContract = z.object({
  ticketId: z.number().int(),
  messageId: z.number().int(),
});

export const supportBusinessHoursRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  timezone: z.string(),
  weeklySchedule: z.record(z.string(), z.unknown()),
  holidays: z.array(z.string()),
  is24x7: z.boolean(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const supportBusinessHoursListContract = z.array(supportBusinessHoursRowContract);
export const supportBusinessHoursContract = supportBusinessHoursRowContract;

const supportCustomFieldRowContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  key: z.string(),
  label: z.string(),
  fieldType: z.string(),
  options: z.array(z.string()).nullable(),
  required: z.boolean(),
  category: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const supportCustomFieldListContract = z.array(supportCustomFieldRowContract);
export const supportCustomFieldContract = supportCustomFieldRowContract;

export const ticketRiskContract = z.object({
  risk: z.enum([
    "ok",
    "first_response_due_soon",
    "first_response_breached",
    "resolution_due_soon",
    "resolution_breached",
    "paused",
  ]),
});

export const channelSuccessContract = z.object({ success: z.literal(true) });
