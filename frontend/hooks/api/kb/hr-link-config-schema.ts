import { z } from "zod";

export const hrKbLinkFlagsContract = z.object({
  link: z.boolean(),
  search: z.boolean(),
  ai: z.boolean(),
});
