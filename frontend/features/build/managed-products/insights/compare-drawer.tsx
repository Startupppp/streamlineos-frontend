"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { DiscoveryCompareOpportunitiesResponse } from "@/contracts/build-contracts.generated";

const MAX_COMPARE = 5;

interface CompareItem {
  id: number;
  title: string;
}

interface CompareDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: ReadonlySet<number>;
  onDeselect: (id: number) => void;
  compareData: DiscoveryCompareOpportunitiesResponse | undefined;
  isLoading: boolean;
  allItems: CompareItem[];
}

export const COMPARE_MAX = MAX_COMPARE;

export function CompareDrawer({
  open,
  onOpenChange,
  selected,
  onDeselect,
  compareData,
  isLoading,
  allItems,
}: CompareDrawerProps) {
  const selectedItems = useMemo(
    () => allItems.filter((item) => selected.has(item.id)),
    [allItems, selected],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-auto p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="text-base">
            Compare opportunities ({selected.size}/{MAX_COMPARE})
          </SheetTitle>
        </SheetHeader>

        <div className="p-4">
          {selectedItems.length === 0 && (
            <p className="text-sm text-muted-foreground">Select up to {MAX_COMPARE} opportunities to compare.</p>
          )}

          {selectedItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                    <th className="px-3 py-2 text-left">Opportunity</th>
                    <th className="px-3 py-2 text-right tabular-nums font-mono">Evidence</th>
                    <th className="px-3 py-2 text-right tabular-nums font-mono">Reach</th>
                    <th className="px-3 py-2 text-right tabular-nums font-mono">Impact</th>
                    <th className="px-3 py-2 text-right tabular-nums font-mono">Confidence</th>
                    <th className="px-3 py-2 text-right tabular-nums font-mono">Effort</th>
                    <th className="px-3 py-2 text-right tabular-nums font-mono">RICE score</th>
                    <th className="px-3 py-2" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item) => {
                    const compItem = compareData?.items.find((c) => c.opportunityId === item.id);
                    const score = compItem?.latestScore;
                    return (
                      <tr key={item.id} className="border-b border-border last:border-0" data-testid={`compare-row-${item.id}`}>
                        <td className="px-3 py-2 font-medium text-foreground max-w-[200px] truncate">
                          {item.title}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono">
                          {compItem?.evidenceCount ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono">
                          {score?.reach ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono">
                          {score?.impact ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono">
                          {score?.confidence ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono">
                          {score?.effort ?? "—"}
                          {score?.effortUnit && (
                            <span className="ml-1 text-xs text-muted-foreground">{score.effortUnit.replace("person_", "")}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono font-semibold">
                          {isLoading ? "..." : (score?.effectiveScore ?? "Unscored")}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => onDeselect(item.id)}
                            aria-label={`Remove ${item.title} from comparison`}
                          >
                            <X className="size-3.5" aria-hidden />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
