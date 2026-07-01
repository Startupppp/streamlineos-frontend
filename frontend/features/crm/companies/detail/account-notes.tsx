"use client";

import { useState, useCallback } from "react";
import { Pencil, Save, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { RichNotesEditor } from "@/features/crm/shared/rich-notes-editor";
import { useUpdateCrmOrganization } from "@/hooks/api/crm";
import { toast } from "sonner";

interface AccountNotesProps {
  organizationId: number;
  initialNotes: string | null;
}

export function AccountNotes({
  organizationId,
  initialNotes,
}: AccountNotesProps) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");

  const updateMutation = useUpdateCrmOrganization();

  const handleSave = useCallback(() => {
    updateMutation.mutate(
      { id: organizationId, notes: notes || null },
      {
        onSuccess: () => {
          toast.success("Notes saved");
          setEditing(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }, [organizationId, notes, updateMutation]);

  const handleCancel = useCallback(() => {
    setNotes(initialNotes ?? "");
    setEditing(false);
  }, [initialNotes]);

  const handleStartEdit = useCallback(() => setEditing(true), []);

  const handleNotesChange = useCallback((value: string) => setNotes(value), []);

  if (!editing) {
    return (
      <div className="space-y-2">
        {notes ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
        ) : (
          <EmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No notes yet"
            compact
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleStartEdit}
        >
          <Pencil className="h-3 w-3" />
          {notes ? "Edit notes" : "Add notes"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <RichNotesEditor
        value={notes}
        onChange={handleNotesChange}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
        placeholder="Add internal notes about this company..."
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          <Save className="h-3 w-3" />
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleCancel}
          disabled={updateMutation.isPending}
        >
          <X className="h-3 w-3" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
