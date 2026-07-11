"use client";

import { useState, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import {
  useHrBudgetVsActual,
  useHrSkillsGap,
  useHrSuccessionRisk,
  useHrAttritionForecast,
  useHrWorkforcePlans,
  useCreateHeadcountPlan,
  useUpdateHeadcountPlan,
  type HeadcountPlan,
} from "@/hooks/api/hr/workforce";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AnalyticsChartCard,
  SectionSkeleton,
  EmptyChart,
  chartTooltipStyle,
  chartGridProps,
  chartAxisTick,
  CHART_SEMANTIC,
} from "@/features/hr/analytics/shared";
import { cn } from "@/lib/utils";

function OverviewTab() {
  const { data: bva, isLoading } = useHrBudgetVsActual();

  if (isLoading) return <SectionSkeleton rows={5} />;
  if (!bva?.length) return <EmptyChart label="No budget data available" />;

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Department</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Budgeted</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actual</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Variance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {bva.map((row) => (
            <tr key={row.departmentName} className="hover:bg-muted/20">
              <td className="px-4 py-2.5 font-medium text-foreground">{row.departmentName}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{row.budgeted}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{row.actual}</td>
              <td className="px-4 py-2.5 text-right">
                <Badge
                  variant="secondary"
                  className={cn(
                    "tabular-nums",
                    row.variance >= 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-600",
                  )}
                >
                  {row.variance >= 0 ? "+" : ""}
                  {row.variance}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PlanSheetProps {
  open: boolean;
  plan: HeadcountPlan | null;
  onClose: () => void;
}

function PlanSheet({ open, plan, onClose }: PlanSheetProps) {
  const create = useCreateHeadcountPlan();
  const update = useUpdateHeadcountPlan();
  const [fiscalYear, setFiscalYear] = useState(String(plan?.fiscalYear ?? new Date().getFullYear()));
  const [headcount, setHeadcount] = useState(String(plan?.budgetedHeadcount ?? ""));
  const [note, setNote] = useState(plan?.note ?? "");

  function handleFiscalYearChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFiscalYear(e.target.value);
  }

  function handleHeadcountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHeadcount(e.target.value);
  }

  function handleNoteChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNote(e.target.value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hc = parseInt(headcount, 10);
    const fy = parseInt(fiscalYear, 10);
    if (isNaN(hc) || isNaN(fy)) return;

    if (plan) {
      update.mutate({ id: plan.id, budgetedHeadcount: hc, note: note || undefined }, { onSuccess: onClose });
    } else {
      create.mutate({ fiscalYear: fy, budgetedHeadcount: hc, note: note || undefined }, { onSuccess: onClose });
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-border/50 pb-3">
          <SheetTitle>{plan ? "Edit Headcount Plan" : "Add Headcount Plan"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="fiscalYear">Fiscal Year</Label>
            <Input
              id="fiscalYear"
              type="number"
              value={fiscalYear}
              onChange={handleFiscalYearChange}
              disabled={!!plan}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="headcount">Budgeted Headcount</Label>
            <Input
              id="headcount"
              type="number"
              value={headcount}
              onChange={handleHeadcountChange}
              required
              min={0}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Input id="note" value={note} onChange={handleNoteChange} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <LoadingButton type="submit" isPending={isPending}>
              {plan ? "Save" : "Create"}
            </LoadingButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function HiringPlansTab() {
  const { data: plans, isLoading } = useHrWorkforcePlans();
  const [sheetPlan, setSheetPlan] = useState<HeadcountPlan | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleAdd() {
    setSheetPlan(null);
    setSheetOpen(true);
  }

  function handleEdit(p: HeadcountPlan) {
    setSheetPlan(p);
    setSheetOpen(true);
  }

  function handleClose() {
    setSheetOpen(false);
  }

  if (isLoading) return <SectionSkeleton rows={4} />;

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Plan
        </Button>
      </div>
      {!plans?.length ? (
        <EmptyChart label="No headcount plans yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Fiscal Year</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Headcount</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Note</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium text-foreground">{p.fiscalYear}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{p.budgetedHeadcount}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.note ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PlanSheet open={sheetOpen} plan={sheetPlan} onClose={handleClose} />
    </>
  );
}

function SkillsGapTab() {
  const { data, isLoading } = useHrSkillsGap();
  const gaps = data?.gaps ?? [];

  if (isLoading) return <SectionSkeleton rows={5} />;
  if (!gaps.length) return <EmptyChart label="No skills gap data available" />;

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Skill</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Required</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Covered</th>
            <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Gap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {gaps.map((row) => (
            <tr key={row.skillName} className="hover:bg-muted/20">
              <td className="px-4 py-2.5 font-medium text-foreground">{row.skillName}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{row.required}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{row.covered}</td>
              <td className="px-4 py-2.5 text-right">
                <Badge
                  variant="secondary"
                  className={row.gap > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}
                >
                  {row.gap}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuccessionTab() {
  const canView = useCan("hr:succession:view");
  const { data, isLoading } = useHrSuccessionRisk();
  const roles = data?.riskyRoles ?? [];

  if (!canView) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        You do not have permission to view succession data.
      </div>
    );
  }

  if (isLoading) return <SectionSkeleton rows={4} />;
  if (!roles.length) return <EmptyChart label="No succession risks identified" />;

  return (
    <div className="space-y-2">
      {roles.map((role, idx) => (
        <div
          key={`${role.roleName}-${idx}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{role.roleName}</p>
            {role.readiness ? (
              <p className="mt-0.5 text-xs text-muted-foreground">Readiness: {role.readiness}</p>
            ) : null}
          </div>
          <Badge
            variant="secondary"
            className={role.hasSuccessor ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}
          >
            {role.hasSuccessor ? "Successor ready" : "No successor"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function AttritionForecastCard() {
  const { data, isLoading } = useHrAttritionForecast();

  const combined = [
    ...(data?.historical.map((h) => ({ month: h.month, historical: h.rate, projected: null })) ?? []),
    ...(data?.forecast.map((f) => ({ month: f.month, historical: null, projected: f.projectedRate })) ?? []),
  ];

  return (
    <AnalyticsChartCard title="Attrition Forecast (Trend-Based Estimate — Not a Prediction)">
      {isLoading ? (
        <SectionSkeleton rows={3} />
      ) : !combined.length ? (
        <EmptyChart label="No forecast data" />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={combined}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="month" tick={chartAxisTick} />
              <YAxis tick={chartAxisTick} width={32} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v}%`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="historical"
                stroke={CHART_SEMANTIC.primary}
                strokeWidth={2}
                dot={false}
                name="Historical"
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke={CHART_SEMANTIC.warning}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                name="Projected"
              />
            </LineChart>
          </ResponsiveContainer>
          {data?.disclaimer ? (
            <p className="mt-2 text-xs text-muted-foreground">{data.disclaimer}</p>
          ) : null}
        </>
      )}
    </AnalyticsChartCard>
  );
}

export function WorkforcePlanningPage() {
  return (
    <PageWrapper
      title="Workforce Planning"
      subtitle="Headcount plans and organizational capacity"
    >
      <div className="space-y-6">
        <AttritionForecastCard />
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="hiring">Hiring Plans</TabsTrigger>
            <TabsTrigger value="skills">Skills Gap</TabsTrigger>
            <TabsTrigger value="succession">Succession Risk</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="hiring" className="space-y-4">
            <HiringPlansTab />
          </TabsContent>
          <TabsContent value="skills" className="space-y-4">
            <SkillsGapTab />
          </TabsContent>
          <TabsContent value="succession" className="space-y-4">
            <SuccessionTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
