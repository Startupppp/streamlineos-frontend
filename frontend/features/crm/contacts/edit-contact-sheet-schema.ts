import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

export const editContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || isValidPhoneNumber(val), {
      message: "Invalid phone number",
    }),
  title: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  source: z.string().optional(),
  notes: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
});

export type EditContactForm = z.infer<typeof editContactSchema>;
