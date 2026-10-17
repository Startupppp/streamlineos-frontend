import { z } from "zod";

export const aiFeedbackCreateContract = z.object({ success: z.literal(true) });
