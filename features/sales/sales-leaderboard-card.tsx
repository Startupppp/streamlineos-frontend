"use client";

import Link from "next/link";
import { Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";
import { motion } from "framer-motion";
import { fadeUp, slideInLeft } from "@/lib/motion-variants";
import { rankStyles } from "@/lib/theme-constants";
import { calcPercent } from "@/lib/format-utils";
import type { SalesLeaderboardItem } from "@/types/crm";
import type { SalesLeaderboardEntryResult } from "@/lib/api/hooks/crm";

const DEFAULT_BAR_COLOR = "bg-muted-foreground/40";

type AnyLeaderboardEntry = SalesLeaderboardItem | SalesLeaderboardEntryResult;

function getDealsCount(rep: AnyLeaderboardEntry): number {
  if ("dealsWon" in rep) return rep.dealsWon;
  return rep.deals;
}

function getWinRate(rep: AnyLeaderboardEntry): number | null {
  if ("winRate" in rep) return rep.winRate;
  return null;
}

interface SalesLeaderboardCardProps {
  leaderboardData: SalesLeaderboardEntryResult[] | undefined;
  salesLeaderboard: SalesLeaderboardItem[];
  datePreset: string;
  datePresetLabel: string;
  maxRevenue: number;
  getPersonSlug: (name: string) => string | null;
}

export function SalesLeaderboardCard({
  leaderboardData,
  salesLeaderboard,
  datePreset,
  datePresetLabel,
  maxRevenue,
  getPersonSlug,
}: SalesLeaderboardCardProps) {
  const reps: AnyLeaderboardEntry[] = leaderboardData ?? salesLeaderboard;

  return (
    <motion.div variants={fadeUp}>
      <Card className="h-full shadow-noir">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-blue-600" />
            Sales Leaderboard
            {datePreset !== "all" && (
              <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                {datePresetLabel}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No activity in this period.</p>
          ) : (
            <div className="space-y-2">
              {reps.map((rep, i) => {
                const isTop3 = i < 3;
                const style = isTop3 && i < rankStyles.length ? rankStyles[i] : null;
                const revenuePercent = Number(calcPercent(rep.revenue, maxRevenue, 0));
                const winRate = getWinRate(rep);
                const dealsCount = getDealsCount(rep);
                const slug = getPersonSlug(rep.name);

                return (
                  <motion.div
                    key={`rep-${i}`}
                    className={cn(
                      "relative rounded-xl p-3 transition-colors",
                      isTop3
                        ? cn("border", style?.bg, style?.border, "ring-1", style?.ring)
                        : "border border-border/50 bg-muted/30",
                    )}
                    variants={slideInLeft}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shrink-0",
                          isTop3 ? cn(style?.bg, style?.text) : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isTop3 ? (
                          <>
                            <Medal className={cn("h-4 w-4", style?.text)} />
                            <span
                              className={cn(
                                "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                                style?.badgeColor,
                              )}
                            >
                              {i + 1}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs">{i + 1}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            {slug ? (
                              <Link
                                href={`/sales/person/${slug}`}
                                className={cn(
                                  "text-sm font-semibold truncate block transition-colors",
                                  isTop3 ? cn(style?.text, "hover:opacity-80") : "text-foreground hover:text-blue-600",
                                )}
                              >
                                {rep.name}
                              </Link>
                            ) : (
                              <p className={cn("text-sm font-semibold truncate", isTop3 ? style?.text : "text-foreground")}>
                                {rep.name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {dealsCount} deals closed
                              {winRate !== null && (
                                <> · <span className="text-emerald-500 font-medium">{winRate}% win</span></>
                              )}
                            </p>
                          </div>
                          <p className={cn("text-sm font-bold tabular-nums shrink-0", isTop3 ? style?.text : "text-foreground")}>
                            {formatCurrency(rep.revenue)}
                          </p>
                        </div>
                        <div
                          className="mt-2 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden"
                          role="progressbar"
                          aria-valuenow={revenuePercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${rep.name} revenue progress`}
                        >
                          <motion.div
                            className={cn("h-full rounded-full", style?.barColor ?? DEFAULT_BAR_COLOR)}
                            initial={{ width: 0 }}
                            animate={{ width: `${revenuePercent}%` }}
                            transition={{ duration: 0.6, delay: 0.4 + i * 0.08 }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
