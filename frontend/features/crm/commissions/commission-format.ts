import { formatMinor } from "@/lib/pricing-format";


export const BPS_SCALE = 10_000;

export function formatBps(bps: number | null): string {
  if (bps === null) return "—";
  const percent = bps / 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/\.?0+$/, "")}%`;
}

export function formatMultiplier(bps: number): string {
  const times = bps / BPS_SCALE;
  return `${Number.isInteger(times) ? times : times.toFixed(2).replace(/\.?0+$/, "")}x`;
}

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
