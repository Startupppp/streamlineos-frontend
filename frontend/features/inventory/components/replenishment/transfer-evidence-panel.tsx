"use client";

import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import type { TransferPlan, WarehousePosition } from "@/hooks/api/inventory/replenishment-planning";

function coverLabel(position: WarehousePosition): string {
  if (position.weeksOfCover === null) return "No demand";
  return `${position.weeksOfCover.toFixed(1)} wk`;
}

/**
 * A site with no demand has no cover figure, and that is not the same as having
 * an enormous one — reporting infinity as a number makes every idle site look
 * like the best donor in the network.
 */
function coverTone(position: WarehousePosition): StatusTone {
  if (position.weeksOfCover === null) return "neutral";
  if (position.weeksOfCover < 2) return "danger";
  if (position.weeksOfCover < 4) return "warning";
  return "success";
}

/** The tone tokens carry their own dark pairing, so no `dark:` twin is written here. */
export function toneChipClass(tone: StatusTone): string {
  const classes = statusToneClasses(tone);
  return cn(classes.surface, classes.ink, classes.rule);
}

interface TransferEvidencePanelProps {
  plan: TransferPlan;
}

/**
 * C5 — the evidence behind every recommendation.
 *
 * A recommendation to move two hundred units is unarguable until you can see
 * what each site holds and how long it lasts them, which is why the positions
 * sit beside the moves rather than behind another click. Every figure here is
 * the exact decimal string the ledger holds; the cover figures are the only
 * estimates and are labelled in weeks.
 */
export function TransferEvidencePanel({ plan }: TransferEvidencePanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className={cn(CONTENT_PANEL_SOLID, "p-4")}>
        <h2 className="text-sm font-semibold">Position at every site</h2>
        <p className="mt-1 text-micro text-muted-foreground">
          Available is on hand less committed, blocked, quality-held and picked stock — the
          one availability formula the ledger uses.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-border/70 text-left">
                <th className="pb-2 text-micro font-medium text-muted-foreground">Warehouse</th>
                <th className="pb-2 text-right text-micro font-medium text-muted-foreground">On hand</th>
                <th className="pb-2 text-right text-micro font-medium text-muted-foreground">Committed</th>
                <th className="pb-2 text-right text-micro font-medium text-muted-foreground">Available</th>
                <th className="pb-2 text-right text-micro font-medium text-muted-foreground">Weekly demand</th>
                <th className="pb-2 text-right text-micro font-medium text-muted-foreground">Cover</th>
              </tr>
            </thead>
            <tbody>
              {plan.positions.map((position) => (
                <tr key={position.warehouseId} className="border-b border-border/60 last:border-0">
                  <td className="py-2 text-dense">{position.warehouseName}</td>
                  <td className="py-2 text-right font-mono text-dense tabular-nums">
                    {formatQuantity(position.onHand)}
                  </td>
                  <td className="py-2 text-right font-mono text-dense tabular-nums text-muted-foreground">
                    {formatQuantity(position.committed)}
                  </td>
                  <td className="py-2 text-right font-mono text-dense font-semibold tabular-nums">
                    {formatQuantity(position.available)}
                  </td>
                  <td className="py-2 text-right font-mono text-dense tabular-nums text-muted-foreground">
                    {formatQuantity(position.weeklyDemand)}
                  </td>
                  <td className="py-2 text-right">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-2 py-0.5 font-mono text-micro tabular-nums",
                        toneChipClass(coverTone(position)),
                      )}
                    >
                      {coverLabel(position)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {plan.caveats.length > 0 && (
        <div className={cn(CONTENT_PANEL_SOLID, "p-4")}>
          <h2 className="text-sm font-semibold">What the plan will not claim</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {plan.caveats.map((caveat) => (
              <li key={caveat} className="text-dense text-muted-foreground">
                {caveat}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
