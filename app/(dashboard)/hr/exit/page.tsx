"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { useResignations, useCreateResignation, useUpdateResignation, type Resignation } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import {
  Plus, CheckCircle2, Clock,
  UserMinus, Calendar, FileText, Download,
} from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";

const NOTICE_PERIOD_DAYS = 60;

function statusBadge(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (status === "COMPLETED") return "default";
  if (status === "APPROVED") return "secondary";
  if (status === "WITHDRAWN") return "destructive";
  return "outline";
}

export default function ExitManagementPage() {
  const { data: session } = useSession();
  const { data: resignations, isLoading } = useResignations();
  const createResignation = useCreateResignation();
  const updateResignation = useUpdateResignation();
  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "HR";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [approveId, setApproveId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const autoLwd = format(addDays(new Date(), NOTICE_PERIOD_DAYS), "yyyy-MM-dd");

  const handleSubmitResignation = useCallback(() => {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    createResignation.mutate(
      { reason: reason.trim(), lastWorkingDate: autoLwd, noticePeriodDays: NOTICE_PERIOD_DAYS },
      {
        onSuccess: () => {
          toast.success("Resignation submitted");
          setSheetOpen(false);
          setReason("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [reason, autoLwd, createResignation]);

  const handleApprove = useCallback(() => {
    if (!approveId) return;
    updateResignation.mutate(
      { id: approveId, status: "APPROVED" },
      {
        onSuccess: () => { toast.success("Resignation approved"); setApproveId(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [approveId, updateResignation]);

  const handleComplete = useCallback((id: number) => {
    updateResignation.mutate(
      { id, status: "COMPLETED" },
      {
        onSuccess: () => toast.success("Exit process completed"),
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [updateResignation]);

  if (isLoading) {
    return (
      <PageWrapper title="Exit Management" subtitle="Resignations and offboarding">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Exit Management"
      subtitle="Resignations, exit interviews, and offboarding"
      badge={`${resignations?.length ?? 0} records`}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Submit Resignation
        </Button>
      }
    >
      {!resignations?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Image
              src="/illustrations/undraw-quitting-time.svg"
              alt="No resignations"
              width={200}
              height={160}
              className="mx-auto mb-4 opacity-90"
            />
            <p className="text-sm text-muted-foreground">No resignations on record.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {resignations.map((r: Resignation) => {
            const daysLeft = r.lastWorkingDate ? differenceInDays(new Date(r.lastWorkingDate), new Date()) : null;
            return (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={resolveImageUrl(r.user?.image ?? null)} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">{r.user?.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{r.user?.name ?? "Employee"}</p>
                      <Badge variant={statusBadge(r.status)} className="text-[10px]">{r.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      {r.user?.designation && <span>{r.user.designation}</span>}
                      {r.lastWorkingDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          LWD: {format(new Date(r.lastWorkingDate), "MMM d, yyyy")}
                        </span>
                      )}
                      {daysLeft !== null && daysLeft > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {daysLeft} days left
                        </span>
                      )}
                      <span>{r.noticePeriodDays}d notice</span>
                    </div>
                  </div>
                  {isAdmin && r.status === "SUBMITTED" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setApproveId(r.id)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                    </Button>
                  )}
                  {isAdmin && r.status === "APPROVED" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleComplete(r.id)}>
                      <FileText className="h-3 w-3 mr-1" />Complete
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Submit Resignation" onSubmit={handleSubmitResignation} submitLabel="Submit" isPending={createResignation.isPending}>
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 flex items-start gap-2.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Notice period is <strong className="text-foreground">60 days</strong> as per company policy.
            Your last working date will be <strong className="text-foreground">{format(addDays(new Date(), NOTICE_PERIOD_DAYS), "dd MMM yyyy")}</strong>.
          </span>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason for Resignation</label>
          <Textarea placeholder="Please describe your reason for leaving..." value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        </div>
        <div className="pt-1">
          <p className="text-xs text-muted-foreground mb-2">Need a template? Download and attach your formal resignation letter:</p>
          <a href="/Resignation Letter Template.docx" download className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="h-3 w-3" />
            Download Resignation Letter Template
          </a>
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={approveId !== null}
        onOpenChange={(open) => { if (!open) setApproveId(null); }}
        title="Approve Resignation"
        description="Are you sure you want to approve this resignation?"
        confirmLabel="Approve"
        variant="default"
        onConfirm={handleApprove}
        isPending={updateResignation.isPending}
      />
    </PageWrapper>
  );
}
