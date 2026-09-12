"use client";

import { useState, type ChangeEvent } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useRecall, useUpdateRecall } from "@/hooks/api/inventory/quality";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  RECALL_STATUS_BADGE,
  RECALL_STATUS_LABEL,
} from "@/features/inventory/lib";
import { cn } from "@/lib/utils";
import { RECALL_LINE_COLUMNS, RecallQuarantineSummary } from "./recall-affected-lines";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recallId: number | null;
}

export function RecallDetailSheet({ open, onOpenChange, recallId }: Props) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const recallQuery = useRecall(recallId ?? 0);
  const updateMut = useUpdateRecall();

  const recall = recallQuery.data;
  const isLoading = recallQuery.isLoading;

  function handleEditNotes(): void {
    setNotesValue(recall?.description ?? "");
    setEditingNotes(true);
  }

  function handleSaveNotes(): void {
    if (!recallId) return;
    updateMut.mutate(
      { recallId, notes: notesValue },
      {
        onSuccess: () => {
          toast.success("Notes updated");
          setEditingNotes(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleActivate(): void {
    if (!recallId) return;
    updateMut.mutate(
      { recallId, status: "IN_PROGRESS" },
      {
        onSuccess: () => toast.success("Recall marked in progress"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleComplete(): void {
    if (!recallId) return;
    updateMut.mutate(
      { recallId, status: "CLOSED" },
      {
        onSuccess: () => toast.success("Recall closed"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleNotesChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setNotesValue(e.target.value);
  }

  function handleDiscardNotes(): void {
    setEditingNotes(false);
  }

  const footer = recall && !isLoading ? (
    <div className="flex items-center gap-2 flex-wrap">
      {recall.status === "OPEN" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={updateMut.isPending}>Start Recall</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start working this recall?</AlertDialogTitle>
              <AlertDialogDescription>
                This marks the recall as in progress while affected stock is traced and blocked.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleActivate}>Start</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {recall.status === "IN_PROGRESS" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" disabled={updateMut.isPending}>Close Recall</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close this recall?</AlertDialogTitle>
              <AlertDialogDescription>
                All affected units have been addressed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleComplete}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  ) : undefined;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={recall?.title ?? `Recall #${recallId ?? "—"}`}
      description="Recall details and affected inventory"
      footer={footer}
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !recall ? (
        <p className="text-sm text-muted-foreground">Could not load recall.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn("h-5 text-micro px-2 border", RECALL_STATUS_BADGE[recall.status])}
            >
              {RECALL_STATUS_LABEL[recall.status]}
            </Badge>
            <Badge variant="outline" className="h-5 text-micro px-2 font-mono">
              {recall.recallNumber}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(recall.createdAt), "dd MMM yyyy")}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Reason</p>
              {!editingNotes && (
                <button
                  type="button"
                  onClick={handleEditNotes}
                  className="text-micro text-primary hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  className="text-xs min-h-[80px] resize-none"
                  value={notesValue}
                  onChange={handleNotesChange}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-6 text-xs px-2" onClick={handleSaveNotes} disabled={updateMut.isPending}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleDiscardNotes}>Discard</Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{recall.description || "—"}</p>
            )}
          </div>

          {recall.lines.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Affected Lines ({recall.lines.length})</p>
              <RecallQuarantineSummary lines={recall.lines} />
              <DataTable
                data={recall.lines}
                columns={RECALL_LINE_COLUMNS}
                getRowKey={(line) => line.id}
              />
            </div>
          )}

          {recall.affectedShipments && recall.affectedShipments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">
                Shipments carrying recalled goods ({recall.affectedShipments.length})
              </p>
              <div className="space-y-1.5">
                {recall.affectedShipments.map((shipment) => (
                  <div
                    key={shipment.shipmentId}
                    className="rounded-md border border-border/60 px-3 py-2"
                  >
                    <TruncatedText text={shipment.shipmentNumber} className="text-xs font-medium" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {recall.evidenceVersion ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Evidence</p>
              <p className="text-micro text-muted-foreground">
                Executed against simulated impact{" "}
                <span className="font-mono">{recall.evidenceVersion}</span>. The server re-checked
                that picture before acting.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Evidence</p>
              <p className="text-micro text-muted-foreground">
                Raised from an explicit line list, so no impact simulation was recorded.
              </p>
            </div>
          )}
        </div>
      )}
    </AppSheet>
  );
}
