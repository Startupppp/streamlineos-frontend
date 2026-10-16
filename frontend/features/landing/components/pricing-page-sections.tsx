import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import { PRICING_TIERS } from "@/lib/pricing";

type MatrixRow = { feature: string; tiers: (boolean | string)[] };

export type PricingComparisonGroup = {
  title: string;
  rows: MatrixRow[];
};

function MatrixCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check
        className="mx-auto h-4 w-4 text-status-success-ink"
        strokeWidth={2.5}
        aria-label="Included"
      />
    ) : (
      <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not included" />
    );
  }
  return <span className="text-xs font-medium text-foreground">{value}</span>;
}

export function PricingFeatureMatrix({ groups }: { groups: PricingComparisonGroup[] }) {
  // The recommended plan's column carries a soft tint all the way down.
  const tint = (tierIndex: number) => (PRICING_TIERS[tierIndex].highlight ? "bg-(--lp-accent-soft)/50" : "");

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="sticky left-0 z-10 min-w-[200px] bg-card px-5 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Included
              </th>
              {PRICING_TIERS.map((tier, index) => (
                <th
                  key={tier.id}
                  className={`min-w-[110px] px-3 py-4 text-center text-base font-semibold text-foreground ${tint(index)}`}
                >
                  {tier.name}
                  {tier.highlight ? (
                    <span className="mt-1 block text-xs font-medium text-(--lp-accent)">Recommended</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.title}>
                <tr className="border-b border-border bg-muted/60">
                  <th
                    colSpan={PRICING_TIERS.length + 1}
                    className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {group.title}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={`${group.title}-${row.feature}`} className="border-b border-border transition-colors last:border-0 hover:bg-muted/50">
                    <td className="sticky left-0 z-10 bg-card px-5 py-3.5 text-sm text-foreground">
                      {row.feature}
                    </td>
                    {row.tiers.map((value, index) => (
                      <td
                        key={PRICING_TIERS[index].id}
                        className={`px-3 py-3.5 text-center text-sm text-muted-foreground ${tint(index)}`}
                      >
                        <MatrixCell value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
