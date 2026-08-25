"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, XCircle, MessageSquare, Clock, AlertTriangle, User } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useWorkflowInstanceDetail,
  useApproveInstance,
  useRejectInstance,
} from "@/hooks/api/hr/hr-workflows";
import {
  HR_WORKFLOW_OBJECT_TYPE_LABELS,
  type HrWorkflowAction,
  type HrWorkflowInstanceStatus,
} from "@/types/hr/workflows";
import { getUserDisplayName } from "@/lib/person-display";

const rejectSchema = z.object({ comment: z.string().min(1, "Comment is required") });
type RejectForm = z.infer<typeof rejectSchema>;

interface Props {
  instanceId: number | null;
  onClose: () => void;
  showActions?: boolean;
}

const STATUS_CONFIG: Record<HrWorkflowInstanceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  approved: { label: "Approved", variant: "outline" },
  rejected: { label: "Rejected", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "secondary" },
  reopened: { label: "Reopened", variant: "default" },
};

const ACTION_ICONS: Record<HrWorkflowAction, ReactNode> = {
  approved: <CheckCircle2 className="h-3.5 w-3.5 text-status-success-ink" />,
  rejected: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  commented: <MessageSquare className="h-3.5 w-3.5 text-primary" />,
  escalated: <AlertTriangle className="h-3.5 w-3.5 text-status-warning-ink" />,
  reassigned: <User className="h-3.5 w-3.5 text-status-info-ink" />,
  cancelled: <XCircle className="h-3.5 w-3.5 text-muted-foreground" />,
  reopened: <CheckCircle2 className="h-3.5 w-3.5 text-primary" />,
};

export function InstanceDetailSheet({ instanceId, onClose, showActions = false }: Props) {
  const { data: instance, isLoading } = useWorkflowInstanceDetail(instanceId);
  const approve = useApproveInstance();
  const reject = useRejectInstance();
  const [showRejectForm, setShowRejectForm] = useState(false);

  const rejectForm = useForm<RejectForm>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { comment: "" },
  });

  const handleApprove = useCallback(() => {
    if (!instanceId) return;
    approve.mutate(
      { instanceId },
      {
        onSuccess: () => {
          toast.success("Approved");
          onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [approve, instanceId, onClose]);

  const handleReject = useCallback((data: RejectForm) => {
    if (!instanceId) return;
    reject.mutate(
      { instanceId, comment: data.comment },
      {
        onSuccess: () => {
          toast.success("Rejected");
          setShowRejectForm(false);
          onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [reject, instanceId, onClose]);

  const statusCfg = instance ? STATUS_CONFIG[instance.status] : null;
  const canAct = showActions && instance && (instance.status === "in_progress" || instance.status === "pending");

  return (
    <Sheet open={instanceId !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex flex-col p-0 gap-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base font-semibold">Approval Request</SheetTitle>
            {statusCfg && <Badge variant={statusCfg.variant} className="text-dense">{statusCfg.label}</Badge>}
          </div>
          {instance && (
            <SheetDescription className="text-xs text-muted-foreground">
              {HR_WORKFLOW_OBJECT_TYPE_LABELS[instance.objectType]} · #{instance.id}
            </SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-5 space-y-5">
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {instance && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider mb-1">Requested by</p>
                    <p className="font-medium">{instance.requester ? getUserDisplayName(instance.requester) : "Unknown user"}</p>
                  </div>
                  <div>
                    <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subject</p>
                    <p className="font-medium">{instance.subjectEmployee ? getUserDisplayName(instance.subjectEmployee) : "Unknown user"}</p>
                  </div>
                  {instance.dueAt && (
                    <div className="col-span-2">
                      <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider mb-1">Due</p>
                      <p className="flex items-center gap-1 text-status-warning-ink font-medium">
                        <Clock className="h-3 w-3" />
                        {new Date(instance.dueAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-3">Timeline</p>
                  {!instance.timeline?.length && (
                    <p className="text-sm text-muted-foreground">No actions yet</p>
                  )}
                  <div className="space-y-3">
                    {instance.timeline?.map((action) => (
                      <div key={action.id} className="flex gap-3">
                        <div className="mt-0.5 shrink-0">{ACTION_ICONS[action.action]}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {action.actedBy ? getUserDisplayName(action.actedBy) : "Unknown user"}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">{action.action}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              Step {action.stepOrder}
                            </span>
                          </div>
                          {action.comment && (
                            <p className="text-xs text-muted-foreground mt-1 bg-muted rounded px-2 py-1">{action.comment}</p>
                          )}
                          <p className="text-micro text-muted-foreground mt-1">
                            {new Date(action.actedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {canAct && (
                  <>
                    <Separator />
                    {showRejectForm ? (
                      <Form {...rejectForm}>
                        <div className="space-y-3">
                          <FormField
                            control={rejectForm.control}
                            name="comment"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold">Rejection Reason</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Provide a reason..." className="text-sm resize-none" rows={3} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex gap-2">
                            <LoadingButton
                              variant="destructive"
                              size="sm"
                              isPending={reject.isPending}
                              onClick={rejectForm.handleSubmit(handleReject)}
                              className="flex-1"
                            >
                              Confirm Reject
                            </LoadingButton>
                            <Button variant="outline" size="sm" onClick={() => setShowRejectForm(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </Form>
                    ) : (
                      <div className="flex gap-2">
                        <LoadingButton
                          size="sm"
                          isPending={approve.isPending}
                          onClick={handleApprove}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </LoadingButton>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRejectForm(true)}
                          className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
