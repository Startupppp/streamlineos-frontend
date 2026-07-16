"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, XCircle, MapPin, Calendar, DollarSign, Plane, User } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  usePendingTravelApprovals,
  useManagerApproveTravelRequest,
  useFinanceApproveTravelRequest,
  useRejectTravelRequest,
  type TravelRequest,
} from "@/hooks/api/hr";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/projects/shared/resolve-user-name";

function ApprovalsLoading() {
  return (
    <PageWrapper title="Travel Approvals" subtitle="Review pending travel requests">
      <div className="space-y-6">
        {Array.from({ length: 8 }).map((_, si) => (
          <div key={si} className="space-y-3">
            <Skeleton className="h-5 w-48" />
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="rounded-lg">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Skeleton className="h-8 w-28 rounded-md" />
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}

function RejectInline({
  id,
  onReject,
  isRejecting,
}: {
  id: number;
  onReject: (id: number, reason: string) => void;
  isRejecting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");

  function handleExpand() {
    setExpanded(true);
  }

  function handleCancel() {
    setExpanded(false);
    setReason("");
  }

  function handleReasonChange(e: React.ChangeEvent<HTMLInputElement>) {
    setReason(e.target.value);
  }

  function handleConfirm() {
    if (!reason.trim()) return;
    onReject(id, reason.trim());
    setExpanded(false);
    setReason("");
  }

  if (!expanded) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-1 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
        onClick={handleExpand}
      >
        <XCircle className="h-3.5 w-3.5" />
        Reject
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        className="text-xs"
        placeholder="Reason for rejection..."
        value={reason}
        onChange={handleReasonChange}
        autoFocus
      />
      <Button
        size="sm"
        className="text-xs shrink-0 bg-rose-600 hover:bg-rose-700 text-white"
        onClick={handleConfirm}
        disabled={!reason.trim() || isRejecting}
      >
        Confirm
      </Button>
      <Button size="sm" variant="ghost" className="text-xs shrink-0" onClick={handleCancel}>
        Cancel
      </Button>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/5 text-foreground text-[11px] font-medium border border-primary/20">
        {count}
      </span>
    </div>
  );
}

const TravelApprovalCard = memo(function TravelApprovalCard({
  request,
  requesterName,
  section,
  onManagerApprove,
  onFinanceApprove,
  onReject,
  isManagerApproving,
  isFinanceApproving,
  isRejecting,
}: {
  request: TravelRequest;
  requesterName: string;
  section: "manager" | "finance";
  onManagerApprove: (id: number) => void;
  onFinanceApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  isManagerApproving: boolean;
  isFinanceApproving: boolean;
  isRejecting: boolean;
}) {
  function handleManagerApprove() {
    onManagerApprove(request.id);
  }

  function handleFinanceApprove() {
    onFinanceApprove(request.id);
  }

  return (
    <motion.div variants={fadeUp}>
      <Card className="bg-card border border-border rounded-lg shadow-sm">
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Plane className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{request.purpose}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  <TruncatedText text={request.destination} className="text-xs text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="text-xs">{requesterName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(request.departureDate), "MMM d")} –{" "}
                      {format(new Date(request.returnDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  {request.estimatedCost && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      <span>₹{Number(request.estimatedCost).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {section === "manager" ? (
                <Button
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={handleManagerApprove}
                  disabled={isManagerApproving}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={handleFinanceApprove}
                  disabled={isFinanceApproving}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Finance Approve
                </Button>
              )}
              <RejectInline id={request.id} onReject={onReject} isRejecting={isRejecting} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

export default function TravelApprovalsPage() {
  const { data: requests, isLoading } = usePendingTravelApprovals();
  const { data: membersData } = useOrgMembers(1, 200);
  const managerApprove = useManagerApproveTravelRequest();
  const financeApprove = useFinanceApproveTravelRequest();
  const reject = useRejectTravelRequest();

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : userId;
    },
    [memberById],
  );

  const handleManagerApprove = useCallback(
    (id: number) => {
      toast.promise(managerApprove.mutateAsync(id), {
        loading: "Approving...",
        success: "Manager approved",
        error: (e: unknown) => getErrorMessage(e),
      });
    },
    [managerApprove],
  );

  const handleFinanceApprove = useCallback(
    (id: number) => {
      toast.promise(financeApprove.mutateAsync(id), {
        loading: "Approving...",
        success: "Finance approved",
        error: (e: unknown) => getErrorMessage(e),
      });
    },
    [financeApprove],
  );

  const handleReject = useCallback(
    (id: number, reason: string) => {
      toast.promise(reject.mutateAsync({ id, reason }), {
        loading: "Rejecting...",
        success: "Request rejected",
        error: (e: unknown) => getErrorMessage(e),
      });
    },
    [reject],
  );

  if (isLoading) return <ApprovalsLoading />;

  const pendingManager = requests?.filter((r) => r.status === "PENDING") ?? [];
  const pendingFinance = requests?.filter((r) => r.status === "MANAGER_APPROVED") ?? [];
  const isEmpty = pendingManager.length === 0 && pendingFinance.length === 0;

  return (
    <PageWrapper
      title="Travel Approvals"
      subtitle="Review pending travel requests"
      badge={undefined}
    >
      {isEmpty ? (
        <EmptyState
          illustrationPreset="travel"
          title="No pending approvals"
          description="All travel requests have been reviewed."
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {pendingManager.length > 0 && (
            <div>
              <SectionHeader title="Awaiting Manager Approval" count={pendingManager.length} />
              <div className="space-y-3">
                {pendingManager.map((r) => (
                  <TravelApprovalCard
                    key={r.id}
                    request={r}
                    requesterName={resolveMemberName(r.userId)}
                    section="manager"
                    onManagerApprove={handleManagerApprove}
                    onFinanceApprove={handleFinanceApprove}
                    onReject={handleReject}
                    isManagerApproving={managerApprove.isPending}
                    isFinanceApproving={financeApprove.isPending}
                    isRejecting={reject.isPending}
                  />
                ))}
              </div>
            </div>
          )}
          {pendingFinance.length > 0 && (
            <div>
              <SectionHeader title="Awaiting Finance Approval" count={pendingFinance.length} />
              <div className="space-y-3">
                {pendingFinance.map((r) => (
                  <TravelApprovalCard
                    key={r.id}
                    request={r}
                    requesterName={resolveMemberName(r.userId)}
                    section="finance"
                    onManagerApprove={handleManagerApprove}
                    onFinanceApprove={handleFinanceApprove}
                    onReject={handleReject}
                    isManagerApproving={managerApprove.isPending}
                    isFinanceApproving={financeApprove.isPending}
                    isRejecting={reject.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </PageWrapper>
  );
}
