import { formatShortDate } from "@/lib/date-utils";
import type { PayrollSourceRef } from "@/types/payroll/runs";

function sourceDate(ref: PayrollSourceRef): string {
  if (!ref.date) return "";
  if (ref.endDate && ref.endDate !== ref.date) {
    return `${formatShortDate(ref.date)} – ${formatShortDate(ref.endDate)}`;
  }
  return formatShortDate(ref.date);
}

export function SourceWhyList({ sources }: { sources?: PayrollSourceRef[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="px-8 pb-1.5 text-micro text-muted-foreground">
      <span className="font-medium text-foreground">Why</span>
      <ul className="space-y-0.5">
        {sources.map((ref, i) => {
          const date = sourceDate(ref);
          return (
            <li key={`${ref.table}-${ref.id ?? "agg"}-${i}`}>
              {ref.label}
              {date ? ` · ${date}` : ""}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
