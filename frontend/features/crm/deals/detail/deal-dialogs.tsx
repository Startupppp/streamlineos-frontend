"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, FolderKanban } from "lucide-react";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";


interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    attendees: string[];
    agenda?: string;
    notes?: string;
    actionItems?: string;
    recordingLink?: string;
  }) => void;
  isPending: boolean;
}

export function MeetingDialog({ open, onOpenChange, onSubmit, isPending }: MeetingDialogProps) {
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [attendees, setAttendees] = useState("");
  const [agenda, setAgenda] = useState("");
  const [notes, setNotes] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [recordingLink, setRecordingLink] = useState("");

  const handleSubmit = useCallback(() => {
    onSubmit({
      title,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes: duration,
      attendees: attendees.split(",").map((a) => a.trim()).filter(Boolean),
      agenda: agenda || undefined,
      notes: notes || undefined,
      actionItems: actionItems || undefined,
      recordingLink: recordingLink || undefined,
    });
  }, [title, scheduledAt, duration, attendees, agenda, notes, actionItems, recordingLink, onSubmit]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setTitle(""); setScheduledAt(""); setDuration(30); setAttendees("");
      setAgenda(""); setNotes(""); setActionItems(""); setRecordingLink("");
    }
    onOpenChange(open);
  }, [onOpenChange]);

  const handleCancel = useCallback(() => handleOpenChange(false), [handleOpenChange]);
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
  const handleScheduledAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setScheduledAt(e.target.value), []);
  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDuration(Number(e.target.value)), []);
  const handleAttendeesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setAttendees(e.target.value), []);
  const handleAgendaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setAgenda(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);
  const handleActionItemsChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setActionItems(e.target.value), []);
  const handleRecordingLinkChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRecordingLink(e.target.value), []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Log Meeting
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2 max-h-[60dvh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="Meeting title..." value={title} onChange={handleTitleChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date & Time *</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={handleScheduledAtChange} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input type="number" min={5} value={duration} onChange={handleDurationChange} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Attendees (comma-separated)</Label>
            <Input placeholder="John, Sarah, Mike..." value={attendees} onChange={handleAttendeesChange} />
          </div>
          <div className="space-y-1.5">
            <Label>Agenda</Label>
            <Textarea rows={2} placeholder="Meeting agenda..." value={agenda} onChange={handleAgendaChange} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Meeting notes..." value={notes} onChange={handleNotesChange} />
          </div>
          <div className="space-y-1.5">
            <Label>Action Items</Label>
            <Textarea rows={2} placeholder="Follow-ups..." value={actionItems} onChange={handleActionItemsChange} />
          </div>
          <div className="space-y-1.5">
            <Label>Recording Link (optional)</Label>
            <Input type="url" placeholder="https://..." value={recordingLink} onChange={handleRecordingLinkChange} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <LoadingButton
            onClick={handleSubmit}
            isPending={isPending}
            loadingText="Saving..."
          >
            Save Meeting
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  onSubmit: (data: { name: string; startDate?: string; endDate?: string }) => void;
  isPending: boolean;
}

export function CreateProjectDialog({ open, onOpenChange, defaultName, onSubmit, isPending }: CreateProjectDialogProps) {
  const [name, setName] = useState(defaultName);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const startBounds = planningStartPickerProps();
  const endBounds = planningEndPickerProps({ startDate, mode: "after" });

  const handleSubmit = useCallback(() => {
    onSubmit({
      name,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [name, startDate, endDate, onSubmit]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) { setName(defaultName); setStartDate(""); setEndDate(""); }
    onOpenChange(open);
  }, [onOpenChange, defaultName]);

  const handleCancel = useCallback(() => handleOpenChange(false), [handleOpenChange]);
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);
  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value);
    setEndDate((prev) => clearEndIfInvalid(value, prev, "after"));
  }, []);
  const handleEndDateChange = useCallback((value: string) => setEndDate(value), []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" /> Create Project from Deal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Project Name *</Label>
            <Input placeholder="e.g. Website Redesign" value={name} onChange={handleNameChange} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <DatePicker
                value={startDate ?? ""}
                onChange={handleStartDateChange}
                placeholder="Pick a date"
                className="text-sm"
                fromDate={startBounds.fromDate}
                fromYear={startBounds.fromYear}
                toYear={startBounds.toYear}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <DatePicker
                value={endDate ?? ""}
                onChange={handleEndDateChange}
                placeholder="Pick a date"
                className="text-sm"
                fromDate={endBounds.fromDate}
                fromYear={endBounds.fromYear}
                toYear={endBounds.toYear}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <LoadingButton
            onClick={handleSubmit}
            isPending={isPending}
            loadingText="Creating..."
          >
            Create Project
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
