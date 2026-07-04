export function formatMoney(
  amountString: string | number | null | undefined,
  currency = "INR",
): string {
  if (amountString === null || amountString === undefined || amountString === "") {
    return "—";
  }
  const amount = typeof amountString === "string" ? parseFloat(amountString) : amountString;
  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMonth(yyyyMm: string): string {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm;
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
