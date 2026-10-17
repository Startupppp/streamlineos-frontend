"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateScheduledReport, type ReportEntity, type ReportSchedule } from "@/hooks/api";

interface RecipientBadgeProps {
  email: string;
  onRemove: (email: string) => void;
}

function RecipientBadge({ email, onRemove }: RecipientBadgeProps) {
  function handleRemove() {
    onRemove(email);
  }
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      {email}
      <button
        type="button"
        onClick={handleRemove}
        className="ml-0.5 hover:text-destructive"
        aria-label={`Remove ${email}`}
      >
        ×
      </button>
    </Badge>
  );
}

interface ScheduleReportSheetProps {
  entity: ReportEntity;
  fields: string[];
  onClose: () => void;
}

export function ScheduleReportSheet({ entity, fields, onClose }: ScheduleReportSheetProps) {
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState<ReportSchedule>("WEEKLY");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);

  const create = useCreateScheduledReport();

  const handleAddRecipient = useCallback(() => {
    const email = recipientInput.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Invalid email");
      return;
    }
    if (recipients.includes(email)) return;
    setRecipients((prev) => [...prev, email]);
    setRecipientInput("");
  }, [recipientInput, recipients]);

  const handleRemoveRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      toast.error("Report name is required");
      return;
    }
    if (recipients.length === 0) {
      toast.error("At least one recipient required");
      return;
    }
    if (fields.length === 0) {
      toast.error("Select at least one field");
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        reportConfig: { entity, fields, filters: {} },
        schedule,
        recipients,
      },
      {
        onSuccess: () => {
          toast.success("Scheduled report created");
          onClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, recipients, fields, entity, schedule, create, onClose]);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }
  function handleScheduleChange(v: string) {
    setSchedule(v as ReportSchedule);
  }
  function handleRecipientInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRecipientInput(e.target.value);
  }
  function handleRecipientKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddRecipient();
    }
  }
  function handleSheetOpenChange(v: boolean) {
    if (!v) onClose();
  }

  return (
    <Sheet open onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Schedule Report</SheetTitle>
          <SheetDescription>
            Send this report automatically by email
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-6 py-5 space-y-3">
          <div className="space-y-1.5">
            <Label>
              Report Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Weekly Candidates Report"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select value={schedule} onValueChange={handleScheduleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Weekly (every Monday)</SelectItem>
                <SelectItem value="MONTHLY">Monthly (1st of month)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Recipients</Label>
            <div className="flex gap-2">
              <Input
                value={recipientInput}
                onChange={handleRecipientInputChange}
                onKeyDown={handleRecipientKeyDown}
                placeholder="email@company.com"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleAddRecipient}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {recipients.map((r) => (
                <RecipientBadge
                  key={r}
                  email={r}
                  onRemove={handleRemoveRecipient}
                />
              ))}
            </div>
          </div>
        </SheetBody>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={create.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            isPending={create.isPending}
            loadingText="Saving..."
            className="flex-1"
          >
            Schedule Report
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
