"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { getApiError } from "@/lib/api-client";
import { useImportParticipants, type ParticipantImportRow } from "@/hooks/api/surveys/participants";

function parseEmails(raw: string): ParticipantImportRow[] {
  return raw
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((email) => ({ email }));
}

export function AddParticipantsDialog({ surveyId, open, onOpenChange }: { surveyId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [raw, setRaw] = useState("");
  const importParticipants = useImportParticipants(surveyId);

  async function handleImport() {
    const rows = parseEmails(raw);
    if (rows.length === 0) {
      toast.error("Add at least one email");
      return;
    }
    try {
      const created = await importParticipants.mutateAsync({ participants: rows });
      toast.success(`${created.length} participant${created.length === 1 ? "" : "s"} added`);
      setRaw("");
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add participants</DialogTitle>
          <DialogDescription>Paste one email per line, or separate with commas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Emails</Label>
          <Textarea rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="jane@example.com&#10;john@example.com" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={importParticipants.isPending}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
