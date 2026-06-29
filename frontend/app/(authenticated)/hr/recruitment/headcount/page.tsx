"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useHrDepartments } from "@/hooks/api/hr";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { getErrorMessage } from "@/lib/get-error-message";

type HeadcountStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "JOB_CREATED";

interface HeadcountRequest {
  id: number;
  orgId: string;
  departmentId: number | null;
  requestedBy: string;
  requestedRole: string;
  level: string | null;
  justification: string | null;
  targetDate: string | null;
  status: HeadcountStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  linkedJobPostingId: number | null;
  createdAt: string;
  departmentName: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
}

const STATUS_COLORS: Record<HeadcountStatus, string> = {
  DRAFT: "secondary",
  SUBMITTED: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  JOB_CREATED: "default",
} as const;

const HR_ROLES = ["CEO", "HR", "ADMIN", "HR_MANAGER"];

function statusLabel(s: HeadcountStatus): string {
  return s === "JOB_CREATED" ? "Job Created" : s.charAt(0) + s.slice(1).toLowerCase();
}

interface RequestSheetProps {
  initial?: HeadcountRequest | null;
  onClose: () => void;
}

function RequestSheet({ initial, onClose }: RequestSheetProps) {
  const qc = useQueryClient();
  const { data: departments } = useHrDepartments();
  const [role, setRole] = useState(initial?.requestedRole ?? "");
  const [level, setLevel] = useState(initial?.level ?? "");
  const [deptId, setDeptId] = useState(String(initial?.departmentId ?? ""));
  const [justification, setJustification] = useState(initial?.justification ?? "");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [submitStatus, setSubmitStatus] = useState<"DRAFT" | "SUBMITTED">("DRAFT");

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.post("/hr/recruitment/headcount", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.headcountRequests() });
      toast.success("Request created");
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const update = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient.patch(`/hr/recruitment/headcount/${initial?.id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.headcountRequests() });
      toast.success("Request updated");
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleSubmit = useCallback((status: "DRAFT" | "SUBMITTED") => {
    if (!role.trim()) { toast.error("Role is required"); return; }
    const payload = {
      requestedRole: role.trim(),
      level: level.trim() || undefined,
      departmentId: deptId ? Number(deptId) : undefined,
      justification: justification.trim() || undefined,
      targetDate: targetDate || undefined,
      status,
    };
    if (initial) update.mutate(payload);
    else create.mutate(payload);
  }, [role, level, deptId, justification, targetDate, initial, create, update]);

  const isPending = create.isPending || update.isPending;

  function handleRoleChange(e: React.ChangeEvent<HTMLInputElement>) { setRole(e.target.value); }
  function handleLevelChange(e: React.ChangeEvent<HTMLInputElement>) { setLevel(e.target.value); }
  function handleTargetDateChange(e: React.ChangeEvent<HTMLInputElement>) { setTargetDate(e.target.value); }
  function handleJustificationChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setJustification(e.target.value); }
  function handleSheetOpenChange(v: boolean) { if (!v) onClose(); }
  function handleSaveDraft() { handleSubmit("DRAFT"); }
  function handleSubmitForApproval() { handleSubmit("SUBMITTED"); }

  return (
    <Sheet open onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{initial ? "Edit" : "New"} Headcount Request</SheetTitle>
          <SheetDescription>Submit a request to hire for a new or replacement position</SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Role <span className="text-destructive">*</span></Label>
            <Input value={role} onChange={handleRoleChange} placeholder="e.g. Senior Software Engineer" />
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Input value={level} onChange={handleLevelChange} placeholder="e.g. L4, Senior, Lead" />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments?.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Target Start Date</Label>
            <Input type="date" value={targetDate} onChange={handleTargetDateChange} />
          </div>
          <div className="space-y-1.5">
            <Label>Justification</Label>
            <Textarea
              rows={4}
              value={justification}
              onChange={handleJustificationChange}
              placeholder="Why is this hire needed?"
            />
          </div>
        </div>
        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="flex-1">Cancel</Button>
          <Button variant="secondary" onClick={handleSaveDraft} disabled={isPending} className="flex-1">
            Save Draft
          </Button>
          <Button onClick={handleSubmitForApproval} disabled={isPending} className="flex-1">
            {isPending ? "Saving..." : "Submit for Approval"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface RejectDialogProps {
  requestId: number;
  onClose: () => void;
}

function RejectDialog({ requestId, onClose }: RejectDialogProps) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const reject = useMutation({
    mutationFn: () => apiClient.post(`/hr/recruitment/headcount/${requestId}/reject`, { reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.headcountRequests() });
      toast.success("Request rejected");
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleReasonChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setReason(e.target.value); }
  function handleDialogOpenChange(v: boolean) { if (!v) onClose(); }
  function handleRejectClick() { reject.mutate(); }

  return (
    <AlertDialog open onOpenChange={handleDialogOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Request</AlertDialogTitle>
          <AlertDialogDescription>
            <Textarea
              rows={3}
              placeholder="Reason for rejection (optional)"
              value={reason}
              onChange={handleReasonChange}
              className="mt-2"
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRejectClick} disabled={reject.isPending}>
            {reject.isPending ? "Rejecting..." : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RequestCard({
  req,
  isHr,
  onEdit,
  onApprove,
  onReject,
  onCreateJob,
}: {
  req: HeadcountRequest;
  isHr: boolean;
  onEdit: (r: HeadcountRequest) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onCreateJob: (id: number) => void;
}) {
  function handleEdit() { onEdit(req); }
  function handleApprove() { onApprove(req.id); }
  function handleReject() { onReject(req.id); }
  function handleCreateJob() { onCreateJob(req.id); }

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{req.requestedRole}</p>
            {req.level && <p className="text-xs text-muted-foreground">{req.level}</p>}
          </div>
          <Badge variant={STATUS_COLORS[req.status] as "default" | "secondary" | "outline" | "destructive"} className="text-[10px] shrink-0">
            {statusLabel(req.status)}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          {req.departmentName && <p>Dept: {req.departmentName}</p>}
          {req.targetDate && <p>Target: {format(new Date(req.targetDate), "MMM d, yyyy")}</p>}
          <p>By: {req.requesterName ?? req.requesterEmail}</p>
          {req.rejectedReason && <p className="text-destructive">Reason: {req.rejectedReason}</p>}
          {req.linkedJobPostingId && (
            <p>Job ID: #{req.linkedJobPostingId}</p>
          )}
        </div>
        {req.justification && (
          <p className="text-xs text-muted-foreground line-clamp-2 border-t pt-2">{req.justification}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {req.status === "DRAFT" && (
            <Button size="sm" variant="outline" onClick={handleEdit}>Edit</Button>
          )}
          {isHr && req.status === "SUBMITTED" && (
            <>
              <Button size="sm" onClick={handleApprove}>Approve</Button>
              <Button size="sm" variant="destructive" onClick={handleReject}>Reject</Button>
            </>
          )}
          {isHr && req.status === "APPROVED" && !req.linkedJobPostingId && (
            <Button size="sm" onClick={handleCreateJob}>Create Job Posting</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function HeadcountPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const role = (session?.user as { role?: string })?.role ?? "";
  const isHr = HR_ROLES.includes(role);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: queryKeys.hr.headcountRequests(),
    queryFn: () => apiClient.get<HeadcountRequest[]>("/hr/recruitment/headcount"),
    staleTime: 2 * 60_000,
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<HeadcountRequest | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const approve = useMutation({
    mutationFn: (id: number) => apiClient.post(`/hr/recruitment/headcount/${id}/approve`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.headcountRequests() });
      toast.success("Request approved");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createJob = useMutation({
    mutationFn: (id: number) => apiClient.post<{ jobId: number }>(`/hr/recruitment/headcount/${id}/create-job`, {}),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: queryKeys.hr.headcountRequests() });
      toast.success("Job posting created");
      router.push(`/hr/recruitment/jobs/${data.jobId}/edit`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleNewRequest = useCallback(() => {
    setEditingRequest(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((r: HeadcountRequest) => {
    setEditingRequest(r);
    setSheetOpen(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingRequest(null);
  }, []);

  const handleApprove = useCallback((id: number) => { approve.mutate(id); }, [approve]);
  const handleCreateJob = useCallback((id: number) => { createJob.mutate(id); }, [createJob]);
  const handleReject = useCallback((id: number) => { setRejectingId(id); }, []);
  const handleCloseRejectDialog = useCallback(() => { setRejectingId(null); }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Headcount Planning" subtitle="Manage hiring requests">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Headcount Planning"
      subtitle="Submit and track headcount requests for new hires"
      badge={`${requests.length} requests`}
      actions={
        <Button size="sm" onClick={handleNewRequest}>
          <svg className="mr-1.5 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Request
        </Button>
      }
    >
      {requests.length === 0 ? (
        <EmptyState
          illustration={<EmptyTeamIllustration />}
          title="No headcount requests"
          description="Submit a request to start the hiring approval process."
          action={{ label: "Create Request", onClick: handleNewRequest }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              isHr={isHr}
              onEdit={handleEdit}
              onApprove={handleApprove}
              onReject={handleReject}
              onCreateJob={handleCreateJob}
            />
          ))}
        </div>
      )}

      {sheetOpen && (
        <RequestSheet initial={editingRequest} onClose={handleCloseSheet} />
      )}
      {rejectingId !== null && (
        <RejectDialog requestId={rejectingId} onClose={handleCloseRejectDialog} />
      )}
    </PageWrapper>
  );
}
