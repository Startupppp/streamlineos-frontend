"use client";

import { use, useState, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IndianRupee, TrendingUp, Pencil } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useProjectBudget, useUpdateProjectBudget, useProjectMembers } from "@/hooks/api/projects";
import { getUserDisplayName, getUserInitials } from "@/features/projects/shared/resolve-user-name";
import { resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";

export default function BudgetPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const { data: budget, isLoading } = useProjectBudget(projectId);
  const { data: members } = useProjectMembers(projectId);
  const updateBudget = useUpdateProjectBudget(projectId);

  const [editMode, setEditMode] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  function handleOpenEdit() {
    setNewBudget(String(budget?.plannedBudget ?? ""));
    setEditMode(true);
  }

  function handleCancelEdit() {
    setEditMode(false);
  }

  function handleBudgetInputChange(e: ChangeEvent<HTMLInputElement>) {
    setNewBudget(e.target.value);
  }

  function handleSaveBudget() {
    const val = Number(newBudget);
    if (!Number.isFinite(val) || val < 0) return;
    updateBudget.mutate(val, {
      onSuccess: () => { toast.success("Budget updated"); setEditMode(false); },
      onError: () => toast.error("Failed to update budget"),
    });
  }

  function resolveMemberUser(userId: string) {
    return members?.find((m) => m.userId === userId)?.user ?? null;
  }

  if (isLoading) {
    return (
      <PageWrapper title="Budget" eyebrow="Project" subtitle="Planned budget vs actual cost from billable timesheets">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-20 rounded-lg" />
      </PageWrapper>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const overBudget = (budget?.remaining ?? 0) < 0;

  return (
    <PageWrapper title="Budget" eyebrow="Project" subtitle="Planned budget vs actual cost from billable timesheets">
      <div className="bg-muted/40 border border-border rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
        {editMode ? (
          <>
            <Label className="text-sm shrink-0">Planned Budget (₹)</Label>
            <Input
              type="number"
              min={0}
              className="h-8 text-sm bg-transparent border-border w-36"
              value={newBudget}
              onChange={handleBudgetInputChange}
              placeholder={String(budget?.plannedBudget ?? "")}
            />
            <Button
              size="sm"
              onClick={handleSaveBudget}
              disabled={updateBudget.isPending}
            >
              {updateBudget.isPending ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={handleOpenEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            {budget?.plannedBudget ? "Update Budget" : "Set Budget"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatCard
          label="Planned Budget"
          value={fmt(budget?.plannedBudget ?? 0)}
          icon={IndianRupee}
          hint={budget?.plannedBudget ? "Project budget" : "Not set"}
          color="blue"
          index={0}
        />
        <StatCard
          label="Actual Cost"
          value={fmt(budget?.actualCost ?? 0)}
          icon={TrendingUp}
          hint={`${(budget?.totalHours ?? 0).toFixed(1)} billable hours`}
          color={overBudget ? "red" : "cyan"}
          index={1}
        />
        <StatCard
          label="Remaining"
          value={fmt(Math.abs(budget?.remaining ?? 0))}
          icon={IndianRupee}
          hint={overBudget ? "Over budget" : "Available"}
          color={overBudget ? "red" : "green"}
          index={2}
        />
      </div>

      {(budget?.plannedBudget ?? 0) > 0 && (
        <Card className="mb-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{budget?.utilizationPct ?? 0}% used</span>
              <span>{fmt(budget?.plannedBudget ?? 0)} planned</span>
            </div>
            <Progress
              value={Math.min(budget?.utilizationPct ?? 0, 100)}
              className={overBudget ? "h-2 [&>div]:bg-red-500" : "h-2 [&>div]:bg-blue-500"}
            />
          </CardContent>
        </Card>
      )}

      {budget?.memberBreakdown && budget.memberBreakdown.length > 0 && (
        <Card className="rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Member Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Member</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hours</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.memberBreakdown.map((m) => {
                    const user = resolveMemberUser(m.userId);
                    const displayName = user ? getUserDisplayName(user) : m.userId.substring(0, 8) + "…";
                    const initials = user ? getUserInitials(user) : "?";
                    const email = user?.email ?? null;
                    return (
                      <tr key={m.userId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarImage src={resolveImageUrl(user?.image)} />
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{displayName}</p>
                              {email && <p className="text-[11px] text-muted-foreground truncate">{email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm text-muted-foreground whitespace-nowrap">{m.hours.toFixed(1)} hrs</td>
                        <td className="px-3 py-2 text-right font-mono text-sm font-medium whitespace-nowrap">{fmt(m.cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {(budget?.memberBreakdown?.length ?? 0) === 0 && !isLoading && (
        <EmptyState
          illustrationPreset="calendar"
          title="No billable time logged"
          description="Log billable hours to track costs against this project's budget."
          className="flex-1 min-h-[40vh]"
        />
      )}
    </PageWrapper>
  );
}
