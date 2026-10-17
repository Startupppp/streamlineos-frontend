import { formatCurrencyFull } from "@/lib/format-utils";

/**
 * The structured CTC behind an offer, on the candidate's public page and on the
 * recruiter's card.
 *
 * Every figure here arrives already summed and already divided into months by
 * the backend (`modules/hr/recruitment/compensation/ctc-breakdown.ts`). Nothing
 * in this file does arithmetic on money, deliberately: adding these decimals up
 * in JavaScript would be a second money implementation, in floating point, and a
 * total on screen that the backend never agreed to.
 */

export interface CtcPreviewLine {
  key: string;
  label: string;
  recurrence: "MONTHLY" | "LUMP_SUM";
  annual: string;
  monthly: string | null;
}

export interface CtcPreview {
  lines: CtcPreviewLine[];
  annualTotal: string | null;
  monthlyTotal: string | null;
  lumpSumTotal: string | null;
}

interface CtcBreakdownPanelProps {
  preview: CtcPreview | null | undefined;
  currency?: string;
  /**
   * Recruiter-only. The candidate's page passes nothing: a reconciliation
   * warning is an instruction to go and fix a number, which is not something to
   * put in front of the person being hired.
   */
  warning?: string | null;
}

interface CtcBreakdownRowProps {
  line: CtcPreviewLine;
  currency: string;
}

/**
 * Paise are shown when there are paise and hidden when there are none.
 *
 * An Indian CTC is almost always whole rupees, and a column of `.00` is noise on
 * a phone screen — but rounding a figure that genuinely carries paise would
 * print a number that does not match the offer. So the decision follows the
 * value rather than the screen.
 */
function money(amount: string, currency: string): string {
  const hasPaise = !amount.endsWith(".00");
  return formatCurrencyFull(amount, currency, undefined, hasPaise ? 2 : 0);
}

/**
 * Label left, amounts stacked right — never three money columns. At 390px, a
 * phone opening this from an email link, a third column is what forces the page
 * to scroll sideways. `min-w-0` lets a long label wrap instead of pushing the
 * amount off-screen.
 */
function CtcBreakdownRow({ line, currency }: CtcBreakdownRowProps) {
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2">
      <span className="min-w-0 flex-1 text-sm text-muted-foreground">{line.label}</span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-medium tabular-nums">
          {money(line.annual, currency)}
        </span>
        <span className="block text-micro text-muted-foreground tabular-nums">
          {line.monthly ? `${money(line.monthly, currency)} / month` : "paid once"}
        </span>
      </span>
    </li>
  );
}

export function CtcBreakdownPanel({ preview, currency = "INR", warning }: CtcBreakdownPanelProps) {
  if (!preview || preview.lines.length === 0) return null;

  function renderRow(line: CtcPreviewLine) {
    return <CtcBreakdownRow key={line.key} line={line} currency={currency} />;
  }

  return (
    <section className="rounded-lg border">
      <div className="flex items-baseline justify-between gap-2 border-b px-3 py-2">
        <h3 className="text-xs font-medium uppercase tracking-wide">Compensation</h3>
        {preview.annualTotal && (
          <span className="text-micro text-muted-foreground">Total cost to company</span>
        )}
      </div>

      <ul className="divide-y">{preview.lines.map(renderRow)}</ul>

      {preview.annualTotal && (
        <div className="flex items-start justify-between gap-3 border-t bg-muted/40 px-3 py-2">
          <span className="min-w-0 flex-1 text-sm font-medium">Total</span>
          <span className="shrink-0 text-right">
            <span className="block text-sm font-semibold tabular-nums">
              {money(preview.annualTotal, currency)}
            </span>
            {/*
              The monthly total covers only the recurring lines. A joining bonus
              folded into a "per month" figure would state a recurring payment
              nobody offered, so it is named separately rather than averaged in.
            */}
            {preview.monthlyTotal && (
              <span className="block text-micro text-muted-foreground tabular-nums">
                {money(preview.monthlyTotal, currency)} / month recurring
              </span>
            )}
            {preview.lumpSumTotal && (
              <span className="block text-micro text-muted-foreground tabular-nums">
                {money(preview.lumpSumTotal, currency)} one-time
              </span>
            )}
          </span>
        </div>
      )}

      {warning && (
        <p className="border-t bg-status-warning-surface px-3 py-2 text-micro text-status-warning-ink">
          {warning}
        </p>
      )}
    </section>
  );
}
