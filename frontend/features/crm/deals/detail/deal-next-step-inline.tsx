"use client";

import { useState, useCallback } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePatchNextStep } from "@/hooks/api/crm";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface DealNextStepInlineProps {
  dealId: number;
  nextStep: string | null;
}

export function DealNextStepInline({ dealId, nextStep }: DealNextStepInlineProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nextStep ?? "");
  const patch = usePatchNextStep(dealId);

  const handleEdit = useCallback(() => {
    setDraft(nextStep ?? "");
    setEditing(true);
  }, [nextStep]);

  const handleCancel = useCallback(() => setEditing(false), []);

  const handleSave = useCallback(() => {
    patch.mutate(
      { nextStep: draft },
      {
        onSuccess: () => {
          toast.success("Next step saved");
          setEditing(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [patch, draft]);

  const handleDraftChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value),
    [],
  );

  return (
    <Card className="shadow-noir">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Next Step</CardTitle>
        {!editing && (
          <Button variant="ghost" size="icon" className="w-7" onClick={handleEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={handleDraftChange}
              rows={3}
              placeholder="What needs to happen next?"
              className="text-sm resize-none"
            />
            <div className="flex gap-1.5 justify-end">
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={patch.isPending}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={patch.isPending}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {nextStep ?? (
              <span className="italic">No next step defined — click edit to add one.</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
