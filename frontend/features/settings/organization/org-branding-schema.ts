import { z } from "zod";

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const httpUrlOrEmpty = z
  .string()
  .url("Must be a valid URL")
  .refine((v) => /^https?:\/\//i.test(v), "Only http: or https: URLs are accepted")
  .or(z.literal(""))
  .optional();

export const brandingSchema = z.object({
  logo: httpUrlOrEmpty,
  favicon: httpUrlOrEmpty,
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
  loginBgUrl: httpUrlOrEmpty,
});

export type BrandingValues = z.infer<typeof brandingSchema>;
