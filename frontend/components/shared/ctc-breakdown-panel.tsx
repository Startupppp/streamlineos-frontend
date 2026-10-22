import { formatCurrencyFull } from "@/lib/format-utils";


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
  warning?: string | null;
}

interface CtcBreakdownRowProps {
  line: CtcPreviewLine;
  currency: string;
}

function money(amount: string, currency: string): string {
  const hasPaise = !amount.endsWith(".00");
  return formatCurrencyFull(amount, currency, undefined, hasPaise ? 2 : 0);
}

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
