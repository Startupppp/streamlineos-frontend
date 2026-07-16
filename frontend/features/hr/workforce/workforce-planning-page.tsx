"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useCan } from "@/hooks/api/access";
import {
  useHrBudgetVsActual,
  useHrSkillsGap,
  useHrSuccessionRisk,
  useHrWorkforcePlans,
  useCreateHeadcountPlan,
  useUpdateHeadcountPlan,
  type HeadcountPlan,
} from "@/hooks/api/hr/workforce";
import {
  SectionSkeleton,
  EmptyChart,
} from "@/features/hr/analytics/shared";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const AttritionForecastCard = dynamic(
  () => import("./attrition-forecast-card").then((m) => ({ default: m.AttritionForecastCard })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full rounded-xl" /> },
);
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

type BudgetVsActualRow = { departmentName: string; budgeted: number; actual: number; variance: number };

const overviewColumns: DataTableColumn<BudgetVsActualRow>[] = [
  {
    key: "departmentName",
    header: "Department",
    cell: (row) => <span className="font-medium text-foreground">{row.departmentName}</span>,
  },
  {
    key: "budgeted",
    header: "Budgeted",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-foreground",
    cell: (row) => row.budgeted,
  },
  {
    key: "actual",
    header: "Actual",
    headerClassName: "text-right",
    className: "text-right tabular-nums text-foreground",
    cell: (row) => row.actual,
  },
  {
    key: "variance",
    header: "Variance",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <Badge
        variant="secondary"
        className={cn(
          "tabular-nums",
          row.variance >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300",
        )}
      >
        {row.variance >= 0 ? "+" : ""}
        {row.variance}
      </Badge>
    ),
  },
];

function OverviewTab() {
  const { data: bva, isLoading } = useHrBudgetVsActual();

  return (
    <DataTable
      data={bva ?? []}
      columns={overviewColumns}
      getRowKey={(row) => row.departmentName}
      isLoading={isLoading}
      emptyState={<EmptyChart label="No budget data available" />}
    />
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

  function handleClose() {
    setSheetOpen(false);
  }

  function buildColumns(onEdit: (p: HeadcountPlan) => void): DataTableColumn<HeadcountPlan>[] {
    return [
      {
        key: "fiscalYear",
        header: "Fiscal Year",
        cell: (row) => <span className="font-medium text-foreground">{row.fiscalYear}</span>,
      },
      {
        key: "budgetedHeadcount",
        header: "Headcount",
        headerClassName: "text-right",
        className: "text-right tabular-nums text-foreground",
        cell: (row) => row.budgetedHeadcount,
      },
      {
        key: "note",
        header: "Note",
        className: "text-muted-foreground",
        cell: (row) => row.note ?? "—",
      },
      {
        key: "actions",
        header: "",
        className: "text-right",
        cell: (row) => (
          <Button variant="ghost" size="sm" onClick={() => onEdit(row)}>
            Edit
          </Button>
        ),
      },
    ];
  }

  function handleEdit(p: HeadcountPlan) {
    setSheetPlan(p);
    setSheetOpen(true);
  }

  const hiringColumns = buildColumns(handleEdit);

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAdd}>
          <PlusIcon size={14} className="mr-1.5" />
          Add Plan
        </Button>
      </div>
      <DataTable
        data={plans ?? []}
        columns={hiringColumns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyState={<EmptyChart label="No headcount plans yet" />}
      />
      <PlanSheet open={sheetOpen} plan={sheetPlan} onClose={handleClose} />
    </>
  );
}

type SkillsGapRow = { skillName: string; required: number; covered: number; gap: number };

const skillsGapColumns: DataTableColumn<SkillsGapRow>[] = [
  {
    key: "skillName",
    header: "Skill",
    cell: (row) => <span className="font-medium text-foreground">{row.skillName}</span>,
  },
  {
    key: "required",
    header: "Required",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => row.required,
  },
  {
    key: "covered",
    header: "Covered",
    headerClassName: "text-right",
    className: "text-right tabular-nums",
    cell: (row) => row.covered,
  },
  {
    key: "gap",
    header: "Gap",
    headerClassName: "text-right",
    className: "text-right",
    cell: (row) => (
      <Badge
        variant="secondary"
        className={row.gap > 0 ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}
      >
        {row.gap}
      </Badge>
    ),
  },
];

function SkillsGapTab() {
  const { data, isLoading } = useHrSkillsGap();
  const gaps = data?.gaps ?? [];

  return (
    <DataTable
      data={gaps}
      columns={skillsGapColumns}
      getRowKey={(row) => row.skillName}
      isLoading={isLoading}
      emptyState={<EmptyChart label="No skills gap data available" />}
    />
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

  if (isLoading) return <SectionSkeleton rows={8} />;
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
            className={role.hasSuccessor ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"}
          >
            {role.hasSuccessor ? "Successor ready" : "No successor"}
          </Badge>
        </div>
      ))}
    </div>
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
