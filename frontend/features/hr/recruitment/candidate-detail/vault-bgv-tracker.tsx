"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useUpdateCandidateBgv,
  type BgvStatus,
} from "@/hooks/api/hr/recruitment";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { BgvStatus as CandidateBgvStatus } from "@/types/hr";

const BGV_STATUSES: Array<{ value: BgvStatus; label: string; color: string }> = [
  { value: "NOT_INITIATED", label: "Not Initiated", color: "bg-muted text-muted-foreground border-border" },
  { value: "INITIATED", label: "Initiated", color: "bg-primary/10 text-primary border-primary/20" },
  { value: "PENDING", label: "Pending", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "CLEARED", label: "Cleared", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "FAILED", label: "Failed", color: "bg-destructive/10 text-destructive border-destructive/20" },
];

function getBgvStyle(status: string | null) {
  return BGV_STATUSES.find((s) => s.value === status) ?? BGV_STATUSES[0]!;
}

export interface BgvTrackerProps {
  candidateId: number;
  bgvStatus: CandidateBgvStatus | null;
  bgvAgency: string | null;
  bgvNotes: string | null;
  bgvInitiatedAt: string | null;
  bgvCompletedAt: string | null;
}

export function BgvTracker({
  candidateId,
  bgvStatus,
  bgvAgency,
  bgvNotes,
  bgvInitiatedAt,
  bgvCompletedAt,
}: BgvTrackerProps) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<BgvStatus>(bgvStatus ?? "NOT_INITIATED");
  const [agency, setAgency] = useState(bgvAgency ?? "");
  const [notes, setNotes] = useState(bgvNotes ?? "");

  const update = useUpdateCandidateBgv(candidateId);
  const style = getBgvStyle(bgvStatus);

  const handleStatusChange = useCallback((v: string) => setStatus(v as BgvStatus), []);
  const handleAgencyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setAgency(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);

  const handleSave = useCallback(() => {
    update.mutate(
      { bgvStatus: status, bgvAgency: agency || undefined, bgvNotes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("BgV status updated");
          setEditing(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [update, status, agency, notes]);

  const handleToggleEdit = useCallback(() => setEditing((p) => !p), []);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Background Verification
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-[11px]", style.color)}>
            {style.label}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleToggleEdit}
          >
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {bgvInitiatedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Initiated {format(new Date(bgvInitiatedAt), "d MMM yyyy")}
            </span>
          )}
          {bgvCompletedAt && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Completed {format(new Date(bgvCompletedAt), "d MMM yyyy")}
            </span>
          )}
          {bgvAgency && !editing && (
            <span className="flex items-center gap-1 min-w-0">
              Agency:{" "}
              <TruncatedText
                text={bgvAgency}
                className="font-semibold text-foreground"
              />
            </span>
          )}
        </div>

        {bgvNotes && !editing && (
          <TruncatedText
            text={bgvNotes}
            lines={3}
            className="text-xs text-muted-foreground italic"
          />
        )}

        {editing && (
          <div className="space-y-3 pt-1 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {BGV_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Agency</Label>
                <Input
                  placeholder="e.g. AuthBridge"
                  value={agency}
                  onChange={handleAgencyChange}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                className="text-xs resize-none"
                rows={2}
                placeholder="Internal notes about the verification..."
                value={notes}
                onChange={handleNotesChange}
              />
            </div>
            <LoadingButton
              size="sm"
              className="text-xs"
              onClick={handleSave}
              isPending={update.isPending}
              loadingText="Saving..."
            >
              Save
            </LoadingButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
