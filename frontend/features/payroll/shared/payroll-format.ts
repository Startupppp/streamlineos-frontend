import { formatCurrencyFull } from "@/lib/format-utils";
import type { PolicyPreviewComponent } from "@/types/payroll/setup";

export function formatMoney(
  amountString: string | number | null | undefined,
  currency = "INR",
): string {
  if (amountString === null || amountString === undefined || amountString === "") return "—";
  const amount = typeof amountString === "string" ? parseFloat(amountString) : amountString;
  if (!Number.isFinite(amount)) return "—";
  return formatCurrencyFull(amount, currency);
}

export function formatMonth(yyyyMm: string): string {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm;
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/**
 * How a salary component is calculated, from the definition fields the POLICY preview emits.
 *
 * That route has no `annualCtc` — its request schema is `.strict()` and carries none — so it
 * cannot answer a monthly amount and never has. Rendering `monthlyAmount` there printed an em
 * dash on every line; this prints the basis the route does supply.
 */
export function describeComponentBasis(
  component: Pick<PolicyPreviewComponent, "calcMethod" | "amount" | "percent" | "formula">,
  currency = "INR",
): string {
  switch (component.calcMethod) {
    case "FIXED":
      return component.amount === null
        ? "Fixed amount"
        : `${formatMoney(component.amount, currency)}/mo`;
    case "PERCENT_OF_BASIC":
      return component.percent === null ? "% of Basic" : `${component.percent}% of Basic`;
    case "PERCENT_OF_GROSS":
      return component.percent === null ? "% of Gross" : `${component.percent}% of Gross`;
    case "FORMULA":
      return component.formula ?? "Custom formula";
    case "ATTENDANCE_BASED":
      return "Attendance-linked";
    case "TIMESHEET_BASED":
      return component.formula ?? "Timesheet-linked";
    case "MANUAL":
      return "Entered per run";
  }
}
