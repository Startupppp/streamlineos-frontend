"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { LoadingState } from "@/components/shared/loading-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";

const TRIGGER_LABELS: Record<string, string> = {
  STAGE_CHANGED: "Stage Changed",
  INTERVIEW_RESULT_SET: "Interview Result Set",
  SLA_BREACHED: "SLA Breached",
  OFFER_SENT: "Offer Sent",
  OFFER_ACCEPTED: "Offer Accepted",
  OFFER_REJECTED: "Offer Rejected",
  SCORECARD_SUBMITTED: "Scorecard Submitted",
};

const ACTION_LABELS: Record<string, string> = {
  SEND_EMAIL: "Send Email",
  MOVE_TO_STAGE: "Move to Stage",
  CREATE_INTERVIEW: "Create Interview",
  SEND_NOTIFICATION: "Send Notification",
  NOTIFY_HIRING_MANAGER: "Notify Hiring Manager",
};

type Trigger = keyof typeof TRIGGER_LABELS;
type Action = keyof typeof ACTION_LABELS;

interface PipelineAutomation {
  id: number;
  name: string;
  isActive: boolean;
  trigger: Trigger;
  action: Action;
  createdAt: string;
  creator?: { name: string | null };
}

const BASE_KEY = ["hr", "pipelineAutomations"] as const;

function useAutomations() {
  return useQuery({
    queryKey: BASE_KEY,
    queryFn: () => apiClient.get<PipelineAutomation[]>("/hr/recruitment/automations"),
  });
}

function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; trigger: Trigger; action: Action; isActive: boolean }) =>
      apiClient.post<PipelineAutomation>("/hr/recruitment/automations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: BASE_KEY }),
  });
}

function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.patch<PipelineAutomation>(`/hr/recruitment/automations/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: BASE_KEY }),
  });
}

function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/recruitment/automations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: BASE_KEY }),
  });
}

interface AutomationCardProps {
  auto: PipelineAutomation;
  onToggle: (id: number, isActive: boolean) => void;
  onSetDeleteId: (id: number) => void;
  isTogglePending: boolean;
}

function AutomationCard({ auto, onToggle, onSetDeleteId, isTogglePending }: AutomationCardProps) {
  function handleToggle() { onToggle(auto.id, auto.isActive); }
  function handleDelete() { onSetDeleteId(auto.id); }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{auto.name}</span>
              <Badge variant={auto.isActive ? "default" : "secondary"} className="text-xs">
                {auto.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="rounded-md border px-2 py-0.5 bg-muted/40">
                When: {TRIGGER_LABELS[auto.trigger] ?? auto.trigger}
              </span>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="rounded-md border px-2 py-0.5 bg-muted/40">
                Then: {ACTION_LABELS[auto.action] ?? auto.action}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Created {format(new Date(auto.createdAt), "dd MMM yyyy")}
              {auto.creator?.name && ` by ${auto.creator.name}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleToggle}
              disabled={isTogglePending}
            >
              {auto.isActive ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={handleDelete}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RecruitmentAutomationsPage() {
  const { data: automations, isLoading } = useAutomations();
  const create = useCreateAutomation();
  const toggle = useToggleAutomation();
  const deleteAuto = useDeleteAutomation();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<Trigger>("STAGE_CHANGED");
  const [action, setAction] = useState<Action>("SEND_NOTIFICATION");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const resetForm = useCallback(() => {
    setName("");
    setTrigger("STAGE_CHANGED");
    setAction("SEND_NOTIFICATION");
  }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    create.mutate(
      { name: name.trim(), trigger, action, isActive: true },
      {
        onSuccess: () => { toast.success("Automation created"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, trigger, action, create, resetForm]);

  const handleToggle = useCallback((id: number, isActive: boolean) => {
    toggle.mutate(
      { id, isActive: !isActive },
      {
        onSuccess: () => toast.success(isActive ? "Automation disabled" : "Automation enabled"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [toggle]);

  const handleDelete = useCallback((id: number) => {
    deleteAuto.mutate(id, {
      onSuccess: () => { toast.success("Automation deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteAuto]);

  function handleOpenSheet() { setSheetOpen(true); }
  function handleSheetOpenChange(v: boolean) { if (!v) resetForm(); setSheetOpen(v); }
  function handleCancelSheet() { setSheetOpen(false); resetForm(); }
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) { setName(e.target.value); }
  function handleTriggerChange(v: string) { setTrigger(v as Trigger); }
  function handleActionChange(v: string) { setAction(v as Action); }
  function handleDeleteDialogChange(v: boolean) { if (!v) setDeleteId(null); }
  function handleConfirmDelete() { if (deleteId != null) handleDelete(deleteId); }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pipeline Automations</h1>
          <p className="text-sm text-muted-foreground">Automate actions based on recruitment pipeline events</p>
        </div>
        <Button size="sm" onClick={handleOpenSheet}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Automation
        </Button>
      </div>

      {isLoading ? (
        <LoadingState variant="list" rows={3} />
      ) : !automations?.length ? (
        <EmptyState
          illustration={<EmptyActivityIllustration />}
          title="No automations yet"
          description="Create automations to trigger actions when pipeline events occur."
          action={{ label: "New Automation", onClick: handleOpenSheet }}
        />
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => (
            <AutomationCard
              key={auto.id}
              auto={auto}
              onToggle={handleToggle}
              onSetDeleteId={setDeleteId}
              isTogglePending={toggle.isPending}
            />
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="flex flex-col p-0 gap-0">
          <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">New Automation</SheetTitle>
            <SheetDescription className="text-xs">Define a trigger and action for this automation rule.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="e.g. Notify team on stage change" value={name} onChange={handleNameChange} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">When (Trigger)</label>
              <Select value={trigger} onValueChange={handleTriggerChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Then (Action)</label>
              <Select value={action} onValueChange={handleActionChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCancelSheet}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteId !== null} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
