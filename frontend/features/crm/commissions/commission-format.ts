import { formatMinor } from "@/lib/pricing-format";

/**
 * Rendering commission figures without ever doing arithmetic on them.
 *
 * Every function here formats and returns a string. None of them adds, and none
 * of them is used to derive a number that is then shown beside one the server
 * sent — the whole promise of the accrual payload is that the parts sum to the
 * headline as integers, and a UI that re-totalled in floating point would be
 * the one place that promise could quietly break.
 *
 * `formatMinor` takes the row's own currency rather than the organisation's
 * display currency, because a plan is denominated in the currency it was written
 * in. A rep on a USD plan inside an INR organisation is owed dollars.
 */

export const BPS_SCALE = 10_000;

export function formatCommissionMoney(
  minor: number,
  currency: string,
  locale: string,
): string {
  return formatMinor(minor, currency, locale);
}

/** Basis points as a percentage. 1250 → "12.5%". */
export function formatBps(bps: number | null): string {
  if (bps === null) return "—";
  const percent = bps / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/\.?0+$/, "")}%`;
}

/** An accelerator multiplier. 10000 → "1x", 12500 → "1.25x". */
export function formatMultiplier(bps: number): string {
  const times = bps / BPS_SCALE;
  return `${Number.isInteger(times) ? times : times.toFixed(2).replace(/\.?0+$/, "")}x`;
}

/**
 * A tier's lower bound, which means two different things.
 *
 * With a quota the bands are attainment in basis points; without one they are
 * minor units of the basis. The accrual payload does not restate which, so the
 * caller passes the currency it already knows and we render the unit that
 * currency implies — a bound at or below 100% that is not a round sum of money
 * is far likelier to be attainment.
 */
export function formatTierFrom(
  from: number,
  currency: string,
  locale: string,
  quotaBased: boolean,
): string {
  return quotaBased ? formatBps(from) : formatMinor(from, currency, locale);
}

export function formatPeriodRange(start: string, end: string, locale: string): string {
  const format = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${format(start)} – ${format(end)}`;
}

export function formatEarnedOn(iso: string, locale: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
