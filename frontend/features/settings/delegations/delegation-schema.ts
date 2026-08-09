import { z } from "zod";

export interface Delegation {
  id: string;
  orgId: string;
  delegatorId: string;
  delegateeId: string;
  delegatorName?: string | null;
  delegateeName?: string | null;
  permissions: string[];
  startsAt: string;
  endsAt: string;
  reason: string | null;
  status: string;
  createdAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
}

export const delegationSchema = z
  .object({
    delegateeId: z.string().min(1, "Select a recipient"),
    permissions: z.array(z.string()).min(1, "Select at least one permission"),
    startsAt: z.string().min(1, "Start date required"),
    endsAt: z.string().min(1, "End date required"),
    reason: z.string().max(500).optional(),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: "End date must be after start date",
    path: ["endsAt"],
  });

export type DelegationFormValues = z.infer<typeof delegationSchema>;
