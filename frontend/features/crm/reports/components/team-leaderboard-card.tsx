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
              <Skeleton key={i} className="h-10 w-full" />
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
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Converted</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
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
                    <TableRow key={rep.userId}>
                      <TableCell className="font-medium">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                            i === 0 && "bg-amber-100 text-amber-700",
                            i === 1 && "bg-slate-100 text-slate-600",
                            i === 2 && "bg-orange-100 text-orange-700",
                            i > 2 && "text-muted-foreground",
                          )}
                        >
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{rep.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {rep.leadsAssigned}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600">
                        {rep.leadsConverted}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(rep.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "text-xs font-medium",
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
