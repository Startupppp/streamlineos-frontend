import { z } from "zod";

export const MAX_DELEGATION_DAYS = 90;
const MAX_DELEGATION_MS = MAX_DELEGATION_DAYS * 24 * 60 * 60 * 1000;

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
  })
  .refine(
    (d) =>
      new Date(d.endsAt).getTime() - new Date(d.startsAt).getTime() <=
      MAX_DELEGATION_MS,
    {
      message: `A delegation may not run longer than ${MAX_DELEGATION_DAYS} days`,
      path: ["endsAt"],
    },
  );

export type DelegationFormValues = z.infer<typeof delegationSchema>;
