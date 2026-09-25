import { z } from "zod";

/** `GET /kb/hr-link/config` — what is switched on for this tenant, with the HR module and the switch order already applied. */
export const hrKbLinkFlagsContract = z.object({
  link: z.boolean(),
  search: z.boolean(),
  ai: z.boolean(),
});
