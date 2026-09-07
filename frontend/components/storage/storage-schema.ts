import { z } from "zod";

export const storageUploadContract = z.object({
  key: z.string(),
});
