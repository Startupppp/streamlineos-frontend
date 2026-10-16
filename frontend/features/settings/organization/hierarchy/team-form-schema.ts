import { z } from "zod";

export const teamFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .refine(
      (teamName) => teamName.length === 0 || /[\p{L}\p{N}]/u.test(teamName),
      "Name must contain at least one letter or number",
    ),
  code: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(20, "Max 20 characters")
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
  departmentId: z.string().min(1, "Department is required"),
  leadUserId: z.string().optional(),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
  capacity: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (v === undefined || v === "") return true;
        if (!/^\d+$/.test(v)) return false;
        const n = parseInt(v, 10);
        return n >= 1 && n <= 9999;
      },
      "Must be a whole number between 1 and 9,999",
    ),
});

export type TeamFormValues = z.infer<typeof teamFormSchema>;

export const EMPTY_TEAM_FORM_VALUES: TeamFormValues = {
  name: "",
  code: "",
  departmentId: "",
  leadUserId: "",
  description: "",
  capacity: "",
};
