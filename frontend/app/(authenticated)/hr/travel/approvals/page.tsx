"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, XCircle, MapPin, Calendar, DollarSign, Plane, User } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useMotionVariants } from "@/lib/motion-variants";
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
} from "@/lib/person-display";

function ApprovalsLoading() {
  return (
    <PageWrapper title="Travel Approvals" subtitle="Review pending travel requests">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
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
        className="gap-1 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
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
      <LoadingButton
        size="sm"
        variant="destructive"
        className="text-xs shrink-0"
        onClick={handleConfirm}
        disabled={!reason.trim()}
        isPending={isRejecting}
      >
        Confirm
      </LoadingButton>
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
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/5 text-foreground text-dense font-medium border border-primary/20">
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
  const { fadeUp } = useMotionVariants();

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
                <LoadingButton
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={handleManagerApprove}
                  isPending={isManagerApproving}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </LoadingButton>
              ) : (
                <LoadingButton
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={handleFinanceApprove}
                  isPending={isFinanceApproving}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Finance Approve
                </LoadingButton>
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
  const { staggerContainer } = useMotionVariants();
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
    async (id: number) => {
      const loadingToastId = toast.loading("Approving travel request...");
      try {
        await managerApprove.mutateAsync(id);
        toast.success("Travel request approved by manager", { id: loadingToastId });
      } catch (error) {
        toast.error(getErrorMessage(error), { id: loadingToastId });
      }
    },
    [managerApprove],
  );

  const handleFinanceApprove = useCallback(
    async (id: number) => {
      const loadingToastId = toast.loading("Approving travel request...");
      try {
        await financeApprove.mutateAsync(id);
        toast.success("Travel request approved by finance", { id: loadingToastId });
      } catch (error) {
        toast.error(getErrorMessage(error), { id: loadingToastId });
      }
    },
    [financeApprove],
  );

  const handleReject = useCallback(
    async (id: number, reason: string) => {
      if (!reason.trim()) {
        toast.error("Please provide a rejection reason");
        return;
      }
      const loadingToastId = toast.loading("Rejecting travel request...");
      try {
        await reject.mutateAsync({ id, reason: reason.trim() });
        toast.success("Travel request rejected", { id: loadingToastId });
      } catch (error) {
        toast.error(getErrorMessage(error), { id: loadingToastId });
      }
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
          className="flex flex-1 min-h-0 flex-col gap-4"
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
