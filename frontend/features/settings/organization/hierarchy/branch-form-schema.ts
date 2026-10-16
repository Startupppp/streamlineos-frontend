import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

export const branchFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .refine(
      (branchName) => branchName.length === 0 || /[\p{L}\p{N}]/u.test(branchName),
      "Name must contain at least one letter or number",
    ),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be at most 20 characters")
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  businessUnitId: z.string().optional(),
  managerUserId: z.string().optional(),
  city: z.string().trim().max(100, "City must be at most 100 characters").optional(),
  state: z.string().trim().max(100, "State must be at most 100 characters").optional(),
  country: z.string().trim().max(100, "Country must be at most 100 characters").optional(),
  postalCode: z.string().trim().max(20, "Postal code must be at most 20 characters").optional(),
  address: z.string().trim().max(500, "Address must be at most 500 characters").optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Phone must be at most 30 characters")
    .refine((val) => !val || isValidPhoneNumber(val), "Enter a valid phone number")
    .optional(),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;

export const EMPTY_BRANCH_FORM_VALUES: BranchFormValues = {
  name: "",
  code: "",
  businessUnitId: "",
  managerUserId: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  address: "",
  phone: "",
  email: "",
};
