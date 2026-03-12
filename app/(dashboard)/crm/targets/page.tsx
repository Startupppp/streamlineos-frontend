"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Trophy, Target, TrendingUp, Plus, Medal, Users,
  Zap, Phone, UserCheck, BarChart3, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { cn, resolveImageUrl } from "@/lib/utils";
import { staggerContainer, fadeUp, slideInLeft } from "@/lib/motion-variants";
import { useMyTargets, useTargetLeaderboard, useCreateTarget } from "@/lib/hooks/trpc-hooks";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const METRIC_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  calls: { icon: Phone, color: "text-blue-400" },
  leads_converted: { icon: UserCheck, color: "text-emerald-400" },
  revenue: { icon: TrendingUp, color: "text-gold" },
  meetings: { icon: Calendar, color: "text-purple-400" },
  deals: { icon: Zap, color: "text-amber-400" },
};

const RANK_STYLES = [
  { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", ring: "ring-amber-500/10", bar: "bg-gradient-to-r from-amber-500 to-amber-400", badge: "bg-amber-500 text-white" },
  { bg: "bg-slate-400/10", border: "border-slate-400/20", text: "text-slate-300", ring: "ring-slate-400/10", bar: "bg-gradient-to-r from-slate-400 to-slate-300", badge: "bg-slate-400 text-white" },
  { bg: "bg-orange-700/10", border: "border-orange-700/20", text: "text-orange-400", ring: "ring-orange-700/10", bar: "bg-gradient-to-r from-orange-700 to-orange-500", badge: "bg-orange-700 text-white" },
];

function getInitials(name: string) {
  return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export default function TargetsPage() {
  const { data: session } = useSession();
  const { data: myTargets, isLoading: targetsLoading } = useMyTargets();
  const { data: leaderboard, isLoading: leaderboardLoading } = useTargetLeaderboard();
  const createTarget = useCreateTarget();
  const [createOpen, setCreateOpen] = useState(false);

  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "ADMIN";

  const handleCreateTarget = async (formData: FormData) => {
    try {
      await createTarget.mutateAsync({
        userId: formData.get("userId") as string || session?.user?.id || "",
        metricType: formData.get("metricType") as string,
        targetValue: formData.get("targetValue") as string,
        period: formData.get("period") as string || "daily",
        startDate: formData.get("startDate") as string,
        endDate: formData.get("endDate") as string,
      });
      toast.success("Target created");
      setCreateOpen(false);
    } catch {
      toast.error("Failed to create target");
    }
  };

  if (targetsLoading || leaderboardLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Targets & Leaderboard"
          description="Track daily targets and team performance rankings"
        />
        {isAdmin && (
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button className="bg-gold hover:bg-gold/90 text-white shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Set Target
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Set New Target</SheetTitle>
              </SheetHeader>
              <form action={handleCreateTarget} className="space-y-4">
                <div>
                  <Label htmlFor="metricType">Metric</Label>
                  <select
                    id="metricType"
                    name="metricType"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="calls">Total Calls</option>
                    <option value="leads_converted">Leads Converted</option>
                    <option value="revenue">Revenue Generated</option>
                    <option value="meetings">Meetings Booked</option>
                    <option value="deals">Deals Closed</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="targetValue">Target Value</Label>
                  <Input id="targetValue" name="targetValue" type="number" required placeholder="e.g. 10" />
                </div>
                <div>
                  <Label htmlFor="period">Period</Label>
                  <select
                    id="period"
                    name="period"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" name="startDate" type="date" required />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" name="endDate" type="date" required />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-gold hover:bg-gold/90 text-white" disabled={createTarget.isPending}>
                    {createTarget.isPending ? "Creating..." : "Create Target"}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        )}
      </motion.div>

      {myTargets && myTargets.length > 0 && (
        <motion.div variants={fadeUp}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-gold" />
            My Targets
          </h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {myTargets.map((target) => {
              const progress = Number(target.targetValue) > 0
                ? Math.min(100, Math.round((Number(target.currentValue ?? 0) / Number(target.targetValue)) * 100))
                : 0;
              const config = METRIC_ICONS[target.metricType] || { icon: BarChart3, color: "text-muted-foreground" };
              const MetricIcon = config.icon;

              return (
                <Card key={target.id} className="shadow-noir overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-muted/50")}>
                          <MetricIcon className={cn("h-4 w-4", config.color)} />
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">{target.metricType.replace("_", " ")}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{target.period}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {progress}%
                      </Badge>
                    </div>

                    <div className="flex items-end justify-between mb-2">
                      <span className="text-2xl font-bold tabular-nums">{Number(target.currentValue ?? 0)}</span>
                      <span className="text-sm text-muted-foreground">/ {Number(target.targetValue)}</span>
                    </div>

                    <div
                      className="h-2 rounded-full bg-muted overflow-hidden"
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${target.metricType} progress`}
                    >
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          progress >= 100 ? "bg-emerald-500" :
                          progress >= 75 ? "bg-gold" :
                          progress >= 50 ? "bg-amber-500" :
                          "bg-blue-500"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                      <span>{target.startDate}</span>
                      <span>{target.endDate}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {myTargets && myTargets.length === 0 && (
        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-full max-w-sm">
                  <Image
                    src="/illustrations/targets-empty.svg"
                    alt="No targets illustration"
                    width={400}
                    height={260}
                    className="mx-auto h-auto w-full"
                    priority
                  />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">No targets assigned yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-md mx-auto">
                    {isAdmin
                      ? "Use the Set Target button above to add daily, weekly, or monthly goals for your team."
                      : "Your admin will set targets for you. Once they do, you’ll see your progress visualized here."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gold" />
          Team Leaderboard
        </h2>
        {leaderboard && leaderboard.length > 0 ? (
          <Card className="shadow-noir">
            <CardContent className="p-4">
              <div className="space-y-2">
                {leaderboard.map((member, i) => {
                  const isTop3 = i < 3;
                  const style = isTop3 ? RANK_STYLES[i] : null;

                  return (
                    <motion.div
                      key={member.userId}
                      className={cn(
                        "relative rounded-xl p-4 transition-colors",
                        isTop3
                          ? cn("border", style?.bg, style?.border, "ring-1", style?.ring)
                          : "border border-border/50 bg-muted/30"
                      )}
                      variants={slideInLeft}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shrink-0",
                          isTop3 ? cn(style?.bg, style?.text) : "bg-muted text-muted-foreground"
                        )}>
                          {isTop3 ? (
                            <>
                              <Medal className={cn("h-5 w-5", style?.text)} />
                              <span className={cn("absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold", style?.badge)}>
                                {i + 1}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs font-bold">{i + 1}</span>
                          )}
                        </div>

                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={resolveImageUrl(member.image)} />
                          <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className={cn("text-sm font-semibold truncate", isTop3 ? style?.text : "text-foreground")}>
                              {member.name}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn("text-sm font-bold tabular-nums", isTop3 ? style?.text : "text-foreground")}>
                                {member.progress}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({member.totalCurrent}/{member.totalTarget})
                              </span>
                            </div>
                          </div>

                          <div
                            className="h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={member.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${member.name} target progress`}
                          >
                            <motion.div
                              className={cn("h-full rounded-full", isTop3 ? style?.bar : "bg-muted-foreground/40")}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, member.progress)}%` }}
                              transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-noir">
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-full max-w-sm">
                  <Image
                    src="/illustrations/leaderboard-empty.svg"
                    alt="No leaderboard data illustration"
                    width={400}
                    height={260}
                    className="mx-auto h-auto w-full"
                  />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">No leaderboard data yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-md mx-auto">
                    Targets need to be set for team members first. Once your team starts tracking activity,
                    their rankings will appear here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
