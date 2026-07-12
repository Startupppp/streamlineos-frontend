import { z } from "zod";

export const PROJECT_NAME_MAX = 100;
export const PROJECT_KEY_MAX = 10;
export const PROJECT_DESCRIPTION_MAX = 2000;

export const basicsSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(PROJECT_NAME_MAX, `Name must be ${PROJECT_NAME_MAX} characters or fewer`)
      .refine((v) => v.trim().length >= 2, { message: "Name cannot be blank or whitespace only" })
      .refine((v) => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(v), {
        message: "Name contains invalid characters",
      }),
    key: z
      .string()
      .min(2, "Key must be at least 2 characters")
      .max(PROJECT_KEY_MAX, `Key must be ${PROJECT_KEY_MAX} characters or fewer`)
      .regex(/^[A-Z][A-Z0-9]*$/, "Key must start with a letter and contain only uppercase letters/numbers"),
    description: z
      .string()
      .max(PROJECT_DESCRIPTION_MAX, `Description must be ${PROJECT_DESCRIPTION_MAX} characters or fewer`)
      .optional(),
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
