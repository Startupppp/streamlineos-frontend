import { z } from "zod";

export const reconSuccessContract = z.object({ success: z.literal(true) });
