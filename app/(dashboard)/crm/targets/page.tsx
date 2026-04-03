"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { EmptyTargetIllustration, EmptyLeaderboardIllustration } from "@/components/illustrations";
import {
  Trophy, Target, TrendingUp, Plus, Medal, Users,
  Zap, Phone, UserCheck, BarChart3, Calendar, History, Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, resolveImageUrl } from "@/lib/utils";
import { staggerContainer, fadeUp, slideInLeft } from "@/lib/motion-variants";
import { useMyTargets, useTargetLeaderboard, useCreateTarget, useTargetHistory } from "@/lib/api/hooks/crm";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { formatDistanceToNow } from "date-fns";

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

function TargetHistoryDialog({ targetId, metricType }: { targetId: number; metricType: string }) {
  const { data: history, isLoading } = useTargetHistory(targetId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="View history">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {metricType.replace(/_/g, " ")} — History
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-3 pt-2">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {history && history.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No changes recorded yet.</p>
          )}
          {history?.map((h) => (
            <div key={h.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
              <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                <AvatarImage src={resolveImageUrl(h.changedBy?.image)} />
                <AvatarFallback className="text-[9px]">{getInitials(h.changedBy?.name ?? "")}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  <span className="font-medium">{h.changedBy?.name}</span>{" "}
                  changed <span className="font-medium">{h.field}</span>{" "}
                  from <span className="text-muted-foreground">{h.oldValue ?? "—"}</span>{" "}
                  to <span className="font-medium">{h.newValue ?? "—"}</span>
                </p>
                {h.createdAt && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(h.createdAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TargetsPage() {
  const { data: session } = useSession();
  const { data: myTargets, isLoading: targetsLoading } = useMyTargets();
  const { data: leaderboard, isLoading: leaderboardLoading } = useTargetLeaderboard();
  const { data: rawEmployees } = useHrEmployees();
  const employees = Array.isArray(rawEmployees) ? rawEmployees : rawEmployees?.data ?? [];
  const createTarget = useCreateTarget();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const userRole = session?.user?.role ?? "";
  const isAdmin = ADMIN_ROLES.includes(userRole);

  const directReports = useMemo(() => {
    if (!employees || !session?.user?.id) return [];
    return employees.filter((e: { reportingTo?: string | null }) => e.reportingTo === session.user.id);
  }, [employees, session?.user?.id]);

  const canSetTargets = isAdmin || directReports.length > 0;

  const assignableEmployees = useMemo(() => {
    if (isAdmin) return employees;
    return directReports;
  }, [isAdmin, employees, directReports]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateTarget = async (formData: FormData) => {
    try {
      const userIds = selectedUserIds.length > 0
        ? selectedUserIds
        : session?.user?.id
          ? [session.user.id]
          : [];

      if (userIds.length === 0) {
        toast.error("Please select at least one team member");
        return;
      }

      await createTarget.mutateAsync({
        userIds,
        metricType: formData.get("metricType") as string,
        targetValue: formData.get("targetValue") as string,
        period: formData.get("period") as string || "daily",
        startDate: formData.get("startDate") as string,
        endDate: formData.get("endDate") as string,
        notes: (formData.get("notes") as string) || undefined,
      });
      toast.success(`Target created for ${userIds.length} member${userIds.length > 1 ? "s" : ""}`);
      setCreateOpen(false);
      setSelectedUserIds([]);
    } catch {
      toast.error("Failed to create target");
    }
  };

  if (targetsLoading || leaderboardLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-6 w-28" />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <div className="flex items-end justify-between">
                    <Skeleton className="h-7 w-8" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-6 w-36" />
          <Card>
            <CardContent className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl p-4 border border-border/50">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-10" />
                          <Skeleton className="h-3 w-14" />
                        </div>
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper
      title="Targets & Leaderboard"
      subtitle="Track daily targets and team performance rankings"
      actions={canSetTargets ? (
          <Sheet open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setSelectedUserIds([]); }}>
            <SheetTrigger asChild>
              <Button className="bg-gold hover:bg-gold/90 text-white shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Set Target
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-[440px] overflow-y-auto p-0">
              <div className="px-6 pt-6 pb-4 border-b">
                <SheetHeader>
                  <SheetTitle className="text-lg">Set New Target</SheetTitle>
                </SheetHeader>
              </div>
              <form action={handleCreateTarget} className="px-6 py-5 space-y-5">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Assign To</Label>
                    {selectedUserIds.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {selectedUserIds.length} selected
                      </Badge>
                    )}
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-lg border bg-muted/30 p-1.5 space-y-0.5">
                    {assignableEmployees.map((emp: { id: string; firstName?: string | null; lastName?: string | null; name?: string | null; image?: string | null }) => {
                      const empName = emp.firstName ? `${emp.firstName} ${emp.lastName ?? ""}`.trim() : (emp.name ?? "Unknown");
                      const selected = selectedUserIds.includes(emp.id);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => toggleUser(emp.id)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all text-left",
                            selected
                              ? "bg-gold/10 ring-1 ring-gold/30"
                              : "hover:bg-muted"
                          )}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={resolveImageUrl(emp.image)} />
                            <AvatarFallback className="text-[10px] font-medium">{getInitials(empName)}</AvatarFallback>
                          </Avatar>
                          <span className={cn("flex-1 truncate", selected && "font-medium")}>{empName}</span>
                          <div className={cn(
                            "h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                            selected ? "border-gold bg-gold" : "border-muted-foreground/30"
                          )}>
                            {selected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                    {assignableEmployees.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No assignable team members</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="metricType" className="text-sm font-medium">Metric</Label>
                  <select
                    id="metricType"
                    name="metricType"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="calls">Total Calls</option>
                    <option value="leads_converted">Leads Converted</option>
                    <option value="revenue">Revenue Generated</option>
                    <option value="meetings">Meetings Booked</option>
                    <option value="deals">Deals Closed</option>
                  </select>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="targetValue" className="text-sm font-medium">Target Value</Label>
                  <Input id="targetValue" name="targetValue" type="number" required placeholder="e.g. 10" className="h-10" />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="period" className="text-sm font-medium">Period</Label>
                  <select
                    id="period"
                    name="period"
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2.5">
                    <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
                    <Input id="startDate" name="startDate" type="date" required className="h-10" />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
                    <Input id="endDate" name="endDate" type="date" required className="h-10" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="notes" className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Add context or instructions for this target..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t mt-6">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-gold hover:bg-gold/90 text-white" disabled={createTarget.isPending}>
                    {createTarget.isPending ? "Creating..." : `Create Target${selectedUserIds.length > 1 ? "s" : ""}`}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
      ) : undefined}
    >
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
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
                      <div className="flex items-center gap-1">
                        <TargetHistoryDialog targetId={target.id} metricType={target.metricType} />
                        <Badge variant="outline" className="text-xs">
                          {progress}%
                        </Badge>
                      </div>
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

                    {target.notes && (
                      <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 italic">
                        {target.notes}
                      </p>
                    )}
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
                <EmptyTargetIllustration className="w-40 h-40" />
                <div>
                  <p className="text-base font-medium text-foreground">No targets assigned yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 max-w-md mx-auto">
                    {canSetTargets
                      ? "Use the Set Target button above to add daily, weekly, or monthly goals for your team."
                      : "Your admin will set targets for you. Once they do, you'll see your progress visualized here."}
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
                <EmptyLeaderboardIllustration className="w-40 h-40" />
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
    </PageWrapper>
  );
}
