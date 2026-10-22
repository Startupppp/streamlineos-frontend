
import { formatMoneyRounded } from "@/lib/format-utils";

export function formatMinor(minor: number, currency: string, locale = "en"): string {
  try {
    return formatMoneyRounded(minor / 100, { currency, locale }, minor % 100 === 0 ? 0 : 2);
  } catch {
    return `${currency} ${(minor / 100).toLocaleString(locale)}`;
  }
}
