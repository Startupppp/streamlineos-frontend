import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

export const basicsStepSchema = z.object({
  goals: z.array(z.string()).min(1, "Select at least one goal."),
  industry: z.string().trim().min(1, "Select or enter your industry."),
  companyName: z.string().trim().min(1, "Enter your company name."),
  teamSize: z.string().min(1, "Select your team size."),
  phone: z
    .string()
    .min(1, "Enter your mobile number.")
    .refine((val) => isValidPhoneNumber(val), "Enter a valid mobile number."),
});

export type BasicsStepValues = z.infer<typeof basicsStepSchema>;
