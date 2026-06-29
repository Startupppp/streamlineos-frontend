"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeed } from "@/components/charts/activity-feed";
import { formatCurrency } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { fadeUp, slideInLeft } from "@/lib/motion-variants";
import { getColorSafe, stageColors, rankStyles } from "@/lib/theme-constants";
import { calcPercent } from "@/lib/format-utils";
import type { TopDeal, SalesLeaderboardItem, SalesActivityItem } from "@/types/crm/deals";
import type { SalesLeaderboardEntryResult } from "@/hooks/api/crm/analytics";

const DEFAULT_BAR_COLOR = "bg-muted-foreground/40";

type DatePreset =
  | "all"
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "ytd";

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  all: "All Time",
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  q1: "Q1",
  q2: "Q2",
  q3: "Q3",
  q4: "Q4",
  ytd: "Year to Date",
};

interface SalesLeaderboardProps {
  topDeals: TopDeal[];
  leaderboard: SalesLeaderboardEntryResult[] | SalesLeaderboardItem[];
  salesActivity: SalesActivityItem[];
  maxLeaderboardRevenue: number;
  datePreset: DatePreset;
  getPersonSlug: (name: string) => string | null;
}

export function SalesLeaderboard({
  topDeals,
  leaderboard,
  salesActivity,
  maxLeaderboardRevenue,
  datePreset,
  getPersonSlug,
}: SalesLeaderboardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <motion.div variants={fadeUp}>
        <Card className="h-full shadow-noir">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-blue-600" />
              Top Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No deals in this period.</p>
            ) : (
              <div className="space-y-3">
                {topDeals.map((deal) => (
                  <div
                    key={`${deal.company}-${deal.stage}`}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {deal.company}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            getColorSafe(stageColors, deal.stage),
                          )}
                        >
                          {deal.stage}
                        </span>
                        {getPersonSlug(deal.rep) ? (
                          <Link
                            href={`/sales/person/${getPersonSlug(deal.rep)}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {deal.rep}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">{deal.rep}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(deal.value)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{deal.probability}% prob</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="h-full shadow-noir">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-blue-600" />
              Sales Leaderboard
              {datePreset !== "all" && (
                <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                  {DATE_PRESET_LABELS[datePreset]}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activity in this period.</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((rep, i) => {
                  const isTop3 = i < 3;
                  const style = isTop3 && i < rankStyles.length ? rankStyles[i] : null;
                  const revenuePercent = Number(calcPercent(rep.revenue, maxLeaderboardRevenue, 0));
                  const winRate = "winRate" in rep ? rep.winRate : null;
                  const dealsCount = "dealsWon" in rep ? rep.dealsWon : rep.deals;

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
                            isTop3
                              ? cn(style?.bg, style?.text)
                              : "bg-muted text-muted-foreground",
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
                              {getPersonSlug(rep.name) ? (
                                <Link
                                  href={`/sales/person/${getPersonSlug(rep.name)}`}
                                  className={cn(
                                    "text-sm font-semibold truncate block transition-colors",
                                    isTop3
                                      ? cn(style?.text, "hover:opacity-80")
                                      : "text-foreground hover:text-blue-600",
                                  )}
                                >
                                  {rep.name}
                                </Link>
                              ) : (
                                <p
                                  className={cn(
                                    "text-sm font-semibold truncate",
                                    isTop3 ? style?.text : "text-foreground",
                                  )}
                                >
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
                            <div className="text-right shrink-0">
                              <p
                                className={cn(
                                  "text-sm font-bold tabular-nums",
                                  isTop3 ? style?.text : "text-foreground",
                                )}
                              >
                                {formatCurrency(rep.revenue)}
                              </p>
                            </div>
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
                              className={cn(
                                "h-full rounded-full",
                                style?.barColor ?? DEFAULT_BAR_COLOR,
                              )}
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

      <motion.div variants={fadeUp}>
        <Card className="h-full shadow-noir">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-y-auto pr-1 max-h-[380px]">
              <ActivityFeed items={salesActivity} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
