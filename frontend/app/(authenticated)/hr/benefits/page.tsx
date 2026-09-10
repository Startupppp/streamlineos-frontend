"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, FileText, LayoutGrid, Shield } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BenefitPlanCard } from "@/features/hr/benefits/benefit-plan-card";
import { PlanUpsertSheet } from "@/features/hr/benefits/plan-upsert-sheet";
import { ClaimReviewSheet } from "@/features/hr/benefits/claim-review-sheet";
import { DependentsManager } from "@/features/hr/benefits/dependents-manager";
import {
  useBenefitPlans,
  useMyBenefits,
  useEnroll,
  useWaive,
  useInsuranceClaims,
  type BenefitPlan,
  type InsuranceClaim,
} from "@/hooks/api/hr";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const CLAIM_STATUS_META: Record<
  InsuranceClaim["status"],
  { label: string; className: string }
> = {
  submitted: { label: "Submitted", className: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  in_review: { label: "In Review", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  approved: { label: "Approved", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  rejected: { label: "Rejected", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  paid: { label: "Paid", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
};

function MyBenefitsTab() {
  const { data, isLoading } = useMyBenefits();
  const { data: allPlans } = useBenefitPlans({ status: "active" });
  const enroll = useEnroll();
  const waive = useWaive();

  const enrolledPlanIds = new Set(
    data?.enrollments.filter((e) => e.status === "active").map((e) => e.planId) ?? [],
  );

  const handleEnroll = useCallback(
    (planId: number) => {
      toast.promise(enroll.mutateAsync({ planId }), {
        loading: "Enrolling...",
        success: "Enrolled successfully",
        error: (e: unknown) => getErrorMessage(e),
      });
    },
    [enroll],
  );

  const handleWaive = useCallback(
    (planId: number) => {
      toast.promise(waive.mutateAsync({ planId }), {
        loading: "Waiving...",
        success: "Enrollment waived",
        error: (e: unknown) => getErrorMessage(e),
      });
    },
    [waive],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activePlans = allPlans?.data ?? [];

  return (
    <div className="space-y-4">
      {!activePlans.length ? (
        <EmptyState
          illustrationPreset="payroll"
          title="No active benefit plans"
          description="Your organisation has not configured any benefit plans yet."
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activePlans.map((plan) => (
            <BenefitPlanCard
              key={plan.id}
              plan={plan}
              enrolled={enrolledPlanIds.has(plan.id)}
              onEnroll={() => handleEnroll(plan.id)}
              onWaive={() => handleWaive(plan.id)}
              isPending={enroll.isPending || waive.isPending}
            />
          ))}
        </div>
      )}

      <DependentsManager />
    </div>
  );
}

function buildPlanColumns(
  canManage: boolean,
  onEdit: (plan: BenefitPlan) => void,
): DataTableColumn<BenefitPlan>[] {
  const cols: DataTableColumn<BenefitPlan>[] = [
    {
      key: "name",
      header: "Name",
      cell: (plan) => <span className="text-sm font-medium">{plan.name}</span>,
    },
    {
      key: "category",
      header: "Category",
      cell: (plan) => <span className="text-xs capitalize">{plan.category}</span>,
    },
    {
      key: "provider",
      header: "Provider",
      cell: (plan) => <span className="text-xs text-muted-foreground">{plan.provider ?? "—"}</span>,
    },
    {
      key: "premium",
      header: "Premium",
      cell: (plan) => (
        <span className="text-xs">
          {plan.premiumCents != null
            ? `₹${(plan.premiumCents / 100).toLocaleString("en-IN")}`
            : "—"}
        </span>
      ),
    },
    {
      key: "effectiveFrom",
      header: "Effective",
      cell: (plan) => <span className="text-xs">{plan.effectiveFrom}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (plan) => (
        <Badge
          variant="outline"
          className={cn(
            "text-micro",
            plan.status === "active" && "bg-status-success-surface text-status-success-ink border-status-success-rule",
            plan.status === "draft" && "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
            plan.status === "archived" && "bg-muted text-muted-foreground border-border",
          )}
        >
          {plan.status}
        </Badge>
      ),
    },
  ];

  if (canManage) {
    cols.push({
      key: "actions",
      header: "",
      className: "w-16",
      cell: (plan) => (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={(e) => { e.stopPropagation(); onEdit(plan); }}
        >
          Edit
        </Button>
      ),
    });
  }

  return cols;
}

function buildClaimColumns(
  canManage: boolean,
  onReview: (claim: InsuranceClaim) => void,
): DataTableColumn<InsuranceClaim>[] {
  const cols: DataTableColumn<InsuranceClaim>[] = [
    {
      key: "claimNumber",
      header: "Claim #",
      cell: (claim) => <span className="text-xs font-mono">{claim.claimNumber}</span>,
    },
    {
      key: "claimant",
      header: "Claimant",
      cell: (claim) => (
        <span className="text-sm">{claim.user?.name ?? claim.user?.email ?? "Unknown user"}</span>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      cell: (claim) => (
        <span className="text-xs text-muted-foreground">
          {claim.plan?.name ?? `Plan #${claim.planId}`}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (claim) => (
        <span className="text-sm font-medium">
          ₹{(claim.amountCents / 100).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (claim) => {
        const meta = CLAIM_STATUS_META[claim.status];
        return (
          <Badge variant="outline" className={cn("text-micro", meta.className)}>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      key: "payoutRoute",
      header: "Payout Route",
      cell: (claim) => (
        <span className="text-xs text-muted-foreground capitalize">
          {claim.payoutRoute?.replace(/_/g, " ") ?? "—"}
        </span>
      ),
    },
  ];

  if (canManage) {
    cols.push({
      key: "actions",
      header: "",
      className: "w-20",
      cell: (claim) =>
        claim.status === "submitted" || claim.status === "in_review" ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={(e) => { e.stopPropagation(); onReview(claim); }}
          >
            Review
          </Button>
        ) : null,
    });
  }

  return cols;
}

function PlansAdminTab({ canManage }: { canManage: boolean }) {
  const { data, isLoading } = useBenefitPlans();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<BenefitPlan | undefined>(undefined);

  const handleNew = useCallback(() => {
    setEditPlan(undefined);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((plan: BenefitPlan) => {
    setEditPlan(plan);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditPlan(undefined);
  }, []);

  const plans = data?.data ?? [];

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      {canManage && (
        <div className="flex justify-end shrink-0">
          <Button size="sm" className="gap-1.5" onClick={handleNew}>
            <Plus className="h-3.5 w-3.5" />
            New Plan
          </Button>
        </div>
      )}

      <DataTable<BenefitPlan>
        className="flex-1 min-h-0"
        data={plans}
        columns={buildPlanColumns(canManage, handleEdit)}
        getRowKey={(p) => p.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            illustrationPreset="payroll"
            title="No benefit plans"
            description="Create your first benefit plan to get started."
            action={canManage ? { label: "New Plan", onClick: handleNew } : undefined}
            className={CONTENT_FILL_PANEL}
          />
        }
      />

      <PlanUpsertSheet open={sheetOpen} onOpenChange={handleSheetOpenChange} plan={editPlan} />
    </div>
  );
}

function ClaimsDashboardTab({ canManage }: { canManage: boolean }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewClaim, setReviewClaim] = useState<InsuranceClaim | null>(null);

  const query = statusFilter !== "all" ? { status: statusFilter as InsuranceClaim["status"] } : {};
  const { data, isLoading } = useInsuranceClaims(query);

  const handleStatusFilterChange = useCallback((v: string) => {
    setStatusFilter(v);
  }, []);

  const handleReviewClaim = useCallback((claim: InsuranceClaim) => {
    setReviewClaim(claim);
  }, []);

  const handleReviewSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setReviewClaim(null);
  }, []);

  const claims = data?.data ?? [];

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className={cn("w-40", FILTER_SELECT_TRIGGER)}>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<InsuranceClaim>
        className="flex-1 min-h-0"
        data={claims}
        columns={buildClaimColumns(canManage, handleReviewClaim)}
        getRowKey={(c) => c.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            illustrationPreset="documents"
            title="No claims found"
            description="No insurance claims match the current filter."
            className={CONTENT_FILL_PANEL}
          />
        }
      />

      <ClaimReviewSheet
        open={reviewClaim !== null}
        onOpenChange={handleReviewSheetOpenChange}
        claim={reviewClaim}
      />
    </div>
  );
}

export default function BenefitsPage() {
  const canManage = useCan("hr:benefits:manage");

  return (
    <PageWrapper
      title="Benefits"
      subtitle="Manage employee benefit plans, enrollments, and insurance claims"
    >
      <Tabs defaultValue="my-benefits" className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="my-benefits" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            My Benefits
          </TabsTrigger>
          <TabsTrigger value="claims" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Claims
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="plans" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" />
              Plans Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-benefits" className="mt-0 flex min-h-0 flex-1 flex-col">
          <MyBenefitsTab />
        </TabsContent>

        <TabsContent value="claims" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ClaimsDashboardTab canManage={canManage} />
        </TabsContent>

        {canManage && (
          <TabsContent value="plans" className="mt-0 flex min-h-0 flex-1 flex-col">
            <PlansAdminTab canManage={canManage} />
          </TabsContent>
        )}
      </Tabs>
    </PageWrapper>
  );
}
