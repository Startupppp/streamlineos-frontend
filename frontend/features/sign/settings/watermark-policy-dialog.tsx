"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateWatermarkPolicy } from "@/hooks/api/sign/settings";

const ENVELOPE_STATES = ["draft", "sent", "completed", "voided", "expired"];

export function WatermarkPolicyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [text, setText] = useState("CONFIDENTIAL");
  const [states, setStates] = useState<string[]>(["draft"]);
  const [showOnFinalPdf, setShowOnFinalPdf] = useState(false);
  const create = useCreateWatermarkPolicy();

  function toggleState(state: string) {
    setStates((prev) => (prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]));
  }

  async function handleSubmit() {
    try {
      await create.mutateAsync({
        scopeType: "tenant",
        appliesStates: states,
        text,
        opacity: 30,
        angle: 45,
        color: "#94A3B8",
        fontSize: 36,
        showOnFinalPdf,
        previewOnly: !showOnFinalPdf,
        enabled: true,
      });
      toast.success("Watermark policy created");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New watermark policy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Text</Label>
            <Input value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Apply to states</Label>
            {ENVELOPE_STATES.map((state) => (
              <label key={state} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                <Checkbox checked={states.includes(state)} onCheckedChange={() => toggleState(state)} />
                {state}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={showOnFinalPdf} onCheckedChange={(v) => setShowOnFinalPdf(v === true)} />
            Include on the final signed PDF (not just preview)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton onClick={handleSubmit} isPending={create.isPending} loadingText="Creating…">
            Create
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
