import { z } from "zod";
import { refineDateOrder } from "@/lib/date-refinements";

export const addLinkSchema = z.object({
  projectId: z.string().min(1, "Select a project"),
  ticketId: z.string(),
});

export type AddLinkFormValues = z.infer<typeof addLinkSchema>;

export const checkInSchema = z.object({
  newValue: z.string().min(1, "Value is required").refine(
    (v) => !Number.isNaN(Number(v)),
    "Enter a valid number",
  ),
  note: z.string(),
});

export type CheckInFormValues = z.infer<typeof checkInSchema>;

export const projectGoalFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string(),
    level: z.enum(["company", "team", "individual"]),
    status: z.enum(["not_started", "on_track", "at_risk", "off_track", "completed"]),
    ownerId: z.string(),
    startDate: z.string(),
    dueDate: z.string(),
  })
  .superRefine((data, ctx) => {
    refineDateOrder(data, ctx, {
      startKey: "startDate",
      endKey: "dueDate",
      mode: "after",
      message: "Due date must be after start date",
    });
  });

export type ProjectGoalFormValues = z.infer<typeof projectGoalFormSchema>;
