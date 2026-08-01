import { z } from "zod";

export const successionFormSchema = z
  .object({
    roleName: z
      .string()
      .trim()
      .min(2, "Role name must be at least 2 characters")
      .max(200, "Role name must be at most 200 characters")
      .regex(/[a-zA-Z0-9]/, "Role name must contain at least one letter or number")
      .refine((v) => !/\s{2,}/.test(v), "Cannot have consecutive spaces"),
    successorId: z.string().min(1, "Successor is required"),
    incumbentId: z.string(),
    readiness: z.enum(["ready_now", "1_2_years", "3_plus"]),
    note: z
      .string()
      .trim()
      .max(2000, "Note must be at most 2000 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.incumbentId && data.incumbentId === data.successorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Incumbent and successor must be different people",
        path: ["incumbentId"],
      });
    }
  });
