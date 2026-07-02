import { BarChart3, Activity } from "lucide-react";
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
          <Activity className="h-4 w-4 text-violet-600" />
          Source Attribution
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !sourceReport?.sources?.length ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              No source data available
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Converted</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Avg Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourceReport.sources.map((src) => (
                  <TableRow key={src.source}>
                    <TableCell className="font-medium capitalize">
                      {src.source.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {src.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">
                      {src.converted}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
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
                    <TableCell className="text-right tabular-nums text-muted-foreground">
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
