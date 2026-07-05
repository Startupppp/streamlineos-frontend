import { z } from "zod";

export const basicsSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    key: z
      .string()
      .min(2, "Key must be at least 2 characters")
      .regex(/^[A-Z][A-Z0-9]*$/, "Key must start with a letter and contain only uppercase letters/numbers"),
    description: z.string().optional(),
    managerId: z.string().optional(),
    clientId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    { message: "End date must be on or after start date", path: ["endDate"] }
  );

export type BasicsValues = z.infer<typeof basicsSchema>;
