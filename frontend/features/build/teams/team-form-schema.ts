import { z } from "zod";
import { isValidHexColor } from "@/features/build/shared/column-colors";

export const teamFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  key: z
    .string()
    .min(1, "Key is required")
    .max(10, "Key must be 10 characters or fewer")
    .regex(/^[A-Z0-9]+$/, "Key must be uppercase alphanumeric"),
  icon: z.string().max(32).optional(),
  color: z
    .string()
    .refine(
      (v) => !v || isValidHexColor(v),
      "Enter a 6-digit hex color (#rrggbb)",
    )
    .optional(),
  isPrivate: z.boolean(),
});

export type TeamFormValues = z.infer<typeof teamFormSchema>;

export const teamFormDefaults: TeamFormValues = {
  name: "",
  key: "",
  icon: "",
  color: "",
  isPrivate: false,
};
