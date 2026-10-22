import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";
import type { MoneyDisplay } from "@/lib/format-utils";

export interface OrgDisplay extends MoneyDisplay {
  timezone: string;
}

export const orgDisplayContract: ResponseContract<OrgDisplay> = z.object({
  currency: z.string(),
  locale: z.string(),
  timezone: z.string(),
});
