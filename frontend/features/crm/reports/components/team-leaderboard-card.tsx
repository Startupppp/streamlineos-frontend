import { Trophy, UserCheck } from "lucide-react";
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
import type { SalesLeaderboardEntry } from "@/types/leads";
import { formatCurrency } from "../lib/types";

interface TeamLeaderboardCardProps {
  leaderboard: SalesLeaderboardEntry[] | undefined;
  isLoading: boolean;
}

export function TeamLeaderboardCard({
  leaderboard,
  isLoading,
}: TeamLeaderboardCardProps) {
  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Team Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !leaderboard?.length ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <UserCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              No team data available
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <TableRow className="border-b-2 border-border hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 w-10">Rank</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Leads</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Converted</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Revenue</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Conv. Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((rep, i) => {
                  const convRate =
                    rep.leadsAssigned > 0
                      ? (
                          (rep.leadsConverted / rep.leadsAssigned) *
                          100
                        ).toFixed(1)
                      : "0.0";

                  return (
                    <TableRow key={rep.userId} className="h-8 hover:bg-muted/30 transition-colors">
                      <TableCell className="px-2 py-1 text-[11px]">
                        <span
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                            i === 0 && "bg-amber-100 text-amber-700",
                            i === 1 && "bg-slate-100 text-slate-600",
                            i === 2 && "bg-orange-100 text-orange-700",
                            i > 2 && "text-muted-foreground",
                          )}
                        >
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1 text-[11px] font-medium">{rep.name}</TableCell>
                      <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums">
                        {rep.leadsAssigned}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums text-emerald-600">
                        {rep.leadsConverted}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums">
                        {formatCurrency(rep.totalRevenue)}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-[11px] text-right">
                        <span
                          className={cn(
                            "font-medium",
                            Number(convRate) >= 50
                              ? "text-emerald-600"
                              : Number(convRate) >= 25
                                ? "text-amber-600"
                                : "text-muted-foreground",
                          )}
                        >
                          {convRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
