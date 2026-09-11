import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";
import type { MoneyDisplay } from "@/lib/format-utils";

/**
 * `GET /me/org-display` — ungated, and the currency every money figure in the
 * app is formatted with. A missing or renamed field here reformats every amount
 * on every screen in the wrong currency, which no error state would announce.
 *
 * `MoneyDisplay` is owned by the formatting layer, so the contract is annotated
 * with it rather than re-declaring it; the compiler keeps the two in step.
 */
export const orgDisplayContract: ResponseContract<MoneyDisplay> = z.object({
  currency: z.string(),
  locale: z.string(),
});
