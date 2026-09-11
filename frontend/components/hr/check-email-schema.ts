import { z } from "zod";

export const checkEmailContract = z.object({ exists: z.boolean() });
