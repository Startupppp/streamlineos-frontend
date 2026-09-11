import { z } from "zod";

export const signedUrlContract = z.object({
  url: z.string(),
});
