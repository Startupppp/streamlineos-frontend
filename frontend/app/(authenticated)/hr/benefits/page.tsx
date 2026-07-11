"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, FileText, Users, LayoutGrid, Shield } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  useSubmitClaim,
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
  submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_review: { label: "In Review", className: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-rose-100 text-rose-700 border-rose-200" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activePlans = allPlans?.data ?? [];

  return (
    <div className="space-y-6">
      {!activePlans.length ? (
        <EmptyState
          illustrationPreset="payroll"
          title="No active benefit plans"
          description="Your organisation has not configured any benefit plans yet."
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const plans = data?.data ?? [];

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" className="h-8 gap-1.5" onClick={handleNew}>
            <Plus className="h-3.5 w-3.5" />
            New Plan
          </Button>
        </div>
      )}

      {!plans.length ? (
        <EmptyState
          illustrationPreset="payroll"
          title="No benefit plans"
          description="Create your first benefit plan to get started."
          action={canManage ? { label: "New Plan", onClick: handleNew } : undefined}
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-semibold">Name</TableHead>
                <TableHead className="text-xs font-semibold">Category</TableHead>
                <TableHead className="text-xs font-semibold">Provider</TableHead>
                <TableHead className="text-xs font-semibold">Premium</TableHead>
                <TableHead className="text-xs font-semibold">Effective</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                {canManage && <TableHead className="text-xs font-semibold w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm font-medium">{plan.name}</TableCell>
                  <TableCell className="text-xs capitalize">{plan.category}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{plan.provider ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {plan.premiumCents != null
                      ? `₹${(plan.premiumCents / 100).toLocaleString("en-IN")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{plan.effectiveFrom}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        plan.status === "active" && "bg-emerald-100 text-emerald-700 border-emerald-200",
                        plan.status === "draft" && "bg-amber-100 text-amber-700 border-amber-200",
                        plan.status === "archived" && "bg-slate-100 text-slate-600 border-slate-200",
                      )}
                    >
                      {plan.status}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleEdit(plan)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const claims = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="h-8 w-40 text-xs">
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

      {!claims.length ? (
        <EmptyState
          illustrationPreset="documents"
          title="No claims found"
          description="No insurance claims match the current filter."
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-semibold">Claim #</TableHead>
                <TableHead className="text-xs font-semibold">Claimant</TableHead>
                <TableHead className="text-xs font-semibold">Plan</TableHead>
                <TableHead className="text-xs font-semibold">Amount</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Payout Route</TableHead>
                {canManage && <TableHead className="text-xs font-semibold w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => {
                const meta = CLAIM_STATUS_META[claim.status];
                return (
                  <TableRow key={claim.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs font-mono">{claim.claimNumber}</TableCell>
                    <TableCell className="text-sm">
                      {claim.user?.name ?? claim.user?.email ?? claim.userId}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {claim.plan?.name ?? `Plan #${claim.planId}`}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      ₹{(claim.amountCents / 100).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", meta.className)}>
                        {meta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">
                      {claim.payoutRoute?.replace(/_/g, " ") ?? "—"}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {(claim.status === "submitted" || claim.status === "in_review") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleReviewClaim(claim)}
                          >
                            Review
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
      <Tabs defaultValue="my-benefits" className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="my-benefits" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" />
            My Benefits
          </TabsTrigger>
          <TabsTrigger value="claims" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Claims
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="plans" className="gap-1.5 text-xs">
              <LayoutGrid className="h-3.5 w-3.5" />
              Plans Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-benefits">
          <MyBenefitsTab />
        </TabsContent>

        <TabsContent value="claims">
          <ClaimsDashboardTab canManage={canManage} />
        </TabsContent>

        {canManage && (
          <TabsContent value="plans">
            <PlansAdminTab canManage={canManage} />
          </TabsContent>
        )}
      </Tabs>
    </PageWrapper>
  );
}
