/**
 * Pure money rendering, with no route to the backend.
 *
 * This lives apart from `pricing-live.ts` for one structural reason:
 * `pricing-live.ts` imports `backend-url.ts`, which is `import "server-only"` on
 * purpose -- that import is what turns "somebody made this a client component"
 * into a build error instead of a runtime mystery. It did exactly that. The
 * commissions page is `"use client"` and reached in here for `formatMinor`
 * alone, so the whole server-only fetch path followed it into the browser
 * bundle and `next build` refused the graph:
 *
 *   app/(authenticated)/crm/commissions/page.tsx  ("use client")
 *     -> features/crm/commissions/commission-format.ts
 *       -> lib/pricing-live.ts
 *         -> lib/backend-url.ts   ("server-only")
 *
 * The guard was right and the fix is not to weaken it. `formatMinor` never
 * needed a backend URL -- it is `Intl` and arithmetic -- so it belongs on the
 * isomorphic side of the line, where either runtime may have it.
 */

import { formatMoneyRounded } from "@/lib/format-utils";

/**
 * Money for reading, which is a different job from money for charging.
 *
 * The backend renders invoice amounts without `Intl` on purpose -- an invoice
 * has to reproduce byte-identically in eighteen months, and `Intl` output moves
 * with the ICU version. This is a price on a web page: it is read once, by a
 * person, in their own conventions, and never has to reproduce. So `Intl` is
 * exactly right here and exactly wrong there.
 */
export function formatMinor(minor: number, currency: string, locale = "en"): string {
  try {
    return formatMoneyRounded(minor / 100, { currency, locale }, minor % 100 === 0 ? 0 : 2);
  } catch {
    // An unknown currency code must still render a number rather than nothing.
    return `${currency} ${(minor / 100).toLocaleString(locale)}`;
  }
}
