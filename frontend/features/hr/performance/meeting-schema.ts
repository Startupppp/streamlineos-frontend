import { z } from "zod";

export const meetingFormSchema = z
  .object({
    employeeId: z.string().min(1, "Employee is required"),
    scheduledDate: z.string().min(1, "Date is required"),
    scheduledTime: z
      .string()
      .min(1, "Time is required")
      .regex(/^\d{2}:\d{2}$/, "Enter a valid time"),
    duration: z
      .string()
      .trim()
      .min(1, "Duration is required")
      .refine((v) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 15 && n <= 480;
      }, "Duration must be a whole number between 15 and 480 minutes"),
    agenda: z
      .string()
      .trim()
      .min(5, "Agenda must be at least 5 characters")
      .max(1000, "Agenda must be at most 1000 characters")
      .regex(/[a-zA-Z0-9]/, "Agenda must contain at least one letter or number")
      .refine((v) => !/\s{2,}/.test(v), "Cannot have consecutive spaces"),
  })
  .superRefine((data, ctx) => {
    const [yr, mo, dy] = data.scheduledDate.split("-").map(Number);
    const [hr, mn] = data.scheduledTime.split(":").map(Number);
    if (
      yr === undefined ||
      mo === undefined ||
      dy === undefined ||
      hr === undefined ||
      mn === undefined
    ) {
      return;
    }
    const localDt = new Date(yr, mo - 1, dy, hr, mn, 0, 0);
    if (Number.isNaN(localDt.getTime()) || localDt <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meeting must be scheduled in the future",
        path: ["scheduledDate"],
      });
    }
  });
