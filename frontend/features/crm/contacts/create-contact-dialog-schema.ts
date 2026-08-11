import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || isValidPhoneNumber(val), {
      message: "Invalid phone number",
    }),
  title: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitterUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
});

export type CreateContactForm = z.infer<typeof createContactSchema>;
