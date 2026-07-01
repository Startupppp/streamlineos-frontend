"use client";

import { useState, useCallback } from "react";
import { Pencil, Save, X } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { RichNotesEditor } from "@/features/crm/shared/rich-notes-editor";
import { useUpdateContact } from "@/hooks/api/crm";
import { toast } from "sonner";

interface ContactNotesProps {
  contactId: number;
  initialNotes: string | null;
}

export function ContactNotes({ contactId, initialNotes }: ContactNotesProps) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");

  const updateMutation = useUpdateContact();

  const handleStartEdit = useCallback(() => setEditing(true), []);

  const handleCancel = useCallback(() => {
    setNotes(initialNotes ?? "");
    setEditing(false);
  }, [initialNotes]);

  const handleNotesChange = useCallback((value: string) => setNotes(value), []);

  const handleSave = useCallback(() => {
    updateMutation.mutate(
      { id: contactId, notes: notes || null },
      {
        onSuccess: () => {
          toast.success("Notes saved");
          setEditing(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }, [contactId, notes, updateMutation]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: 0.08 }}
    >
      <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
        <CardHeader className="px-4 py-3 border-b">
          <CardTitle className="text-sm font-medium">Notes</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3">
          {!editing ? (
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
          ) : (
            <div className="space-y-2">
              <RichNotesEditor
                value={notes}
                onChange={handleNotesChange}
                onSave={handleSave}
                isSaving={updateMutation.isPending}
                placeholder="Add internal notes about this contact..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
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
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
