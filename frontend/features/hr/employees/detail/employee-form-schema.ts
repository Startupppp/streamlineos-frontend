import * as z from "zod";
import { hrPersonNameField } from "@/lib/person-name-schema";

export function makeEmployeeFormSchema(origFirstName: string, origLastName: string) {
  return z.object({
    firstName: z
      .string()
      .trim()
      .superRefine((val, ctx) => {
        if (val === origFirstName) return;
        const result = hrPersonNameField("First name").safeParse(val);
        if (!result.success) {
          for (const issue of result.error.issues) {
            ctx.addIssue(issue);
          }
        }
      }),
    lastName: z
      .string()
      .trim()
      .superRefine((val, ctx) => {
        if (val === origLastName) return;
        const result = hrPersonNameField("Last name").safeParse(val);
        if (!result.success) {
          for (const issue of result.error.issues) {
            ctx.addIssue(issue);
          }
        }
      }),
    designation: z
      .string()
      .trim()
      .min(1, "Designation is required")
      .max(200, "Designation must be at most 200 characters"),
    departmentId: z.string().optional(),
    phone: z
      .string()
      .refine((value) => {
        if (!value) return true;
        const digits = value.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
      }, "Phone number must be 7-15 digits")
      .optional()
      .or(z.literal("")),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    joiningDate: z.date().optional(),
  });
}

export type EmployeeFormValues = z.infer<ReturnType<typeof makeEmployeeFormSchema>>;
