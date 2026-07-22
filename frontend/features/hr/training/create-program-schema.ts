import { z } from "zod";
import { refineDateOrder, refineNotBeforeToday } from "@/lib/date-constraints";

export const createProgramSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    type: z.enum(["MANDATORY", "OPTIONAL", "COMPLIANCE"]),
    format: z.enum(["CLASSROOM", "VIRTUAL", "BLENDED", "SELF_PACED"]),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    venue: z.string().optional(),
    virtualLink: z.string().optional(),
    maxCapacity: z.string().optional(),
    isMandatory: z.boolean(),
  })
  .superRefine((data, ctx) => {
    refineNotBeforeToday(data.startDate, ctx, "startDate", "Start date cannot be in the past");
    refineNotBeforeToday(data.endDate, ctx, "endDate", "End date cannot be in the past");
    refineDateOrder(data, ctx, {
      mode: "after",
      message: "End date must be after start date",
    });
  });

export type CreateProgramFormValues = z.infer<typeof createProgramSchema>;
