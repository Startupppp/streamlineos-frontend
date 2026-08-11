import { z } from "zod";

export const addRoleSchema = z.object({
  entityType: z.enum(["deal", "company"]),
  entityId: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().positive()),
  roleKey: z.string().min(1),
  isPrimary: z.boolean(),
});

export type AddRoleFormInput = z.input<typeof addRoleSchema>;
export type AddRoleFormValues = z.output<typeof addRoleSchema>;
