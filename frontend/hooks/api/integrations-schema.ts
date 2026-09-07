import { z } from "zod";

const wireDate = () => z.string();

const connectionRowSchema = z.object({
  id: z.number().int(),
  toolkit: z.enum(["googlecalendar", "outlook", "gmail"]),
  accountEmail: z.string().nullable(),
  accountLabel: z.string().nullable(),
  status: z.enum(["active", "needs_reauth", "disabled"]),
  isPrimary: z.boolean(),
  createdAt: wireDate(),
});

export const integrationsListContract = z.array(connectionRowSchema);

export const integrationsInitiateContract = z.object({
  redirectUrl: z.string(),
});

export const integrationsFinalizeContract = connectionRowSchema;

export const integrationsDisconnectContract = z.object({
  deleted: z.literal(true),
});

export const integrationsSetPrimaryContract = connectionRowSchema;
