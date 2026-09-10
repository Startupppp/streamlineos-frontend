import { z } from "zod";

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const brandingSchema = z.object({
  logo: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  favicon: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  primaryColor: z
    .string()
    .regex(HEX_COLOR, "Enter a 6-digit hex color (#rrggbb)")
    .or(z.literal(""))
    .optional(),
  secondaryColor: z
    .string()
    .regex(HEX_COLOR, "Enter a 6-digit hex color (#rrggbb)")
    .or(z.literal(""))
    .optional(),
  loginBgUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});

export type BrandingValues = z.infer<typeof brandingSchema>;
