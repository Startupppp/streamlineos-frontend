import { z } from "zod";

export const attendanceEmailReportContract = z.object({
  queued: z.number().int(),
});
