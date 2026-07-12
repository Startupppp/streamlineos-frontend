import { Activity } from "lucide-react";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency, type LeadSourceReport } from "../lib/types";

interface SourceAttributionCardProps {
  sourceReport: LeadSourceReport | undefined;
  isLoading: boolean;
}

export function SourceAttributionCard({
  sourceReport,
  isLoading,
}: SourceAttributionCardProps) {
  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" />
          Source Attribution
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !sourceReport?.sources?.length ? (
          <ChartEmptyState message="No source data available" compact className="py-10 px-4" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <TableRow className="border-b-2 border-border hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Source</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Leads</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Converted</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Win Rate</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Avg Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourceReport.sources.map((src) => (
                  <TableRow key={src.source} className="h-8 hover:bg-muted/30 transition-colors">
                    <TableCell className="px-2 py-1 text-[11px] font-medium capitalize">
                      {src.source.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums">
                      {src.count}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums text-emerald-600">
                      {src.converted}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums">
                      <span
                        className={cn(
                          "font-medium",
                          src.conversionRate >= 50
                            ? "text-emerald-600"
                            : src.conversionRate >= 25
                              ? "text-amber-600"
                              : "text-muted-foreground",
                        )}
                      >
                        {src.conversionRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums text-muted-foreground">
                      {src.count > 0
                        ? formatCurrency(Math.round(src.totalValue / src.count))
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
