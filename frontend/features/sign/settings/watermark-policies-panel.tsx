"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeleteWatermarkPolicy, useSignWatermarkPolicies, useUpdateWatermarkPolicy } from "@/hooks/api/sign/settings";
import { WatermarkPolicyDialog } from "./watermark-policy-dialog";

export function WatermarkPoliciesPanel() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: policies } = useSignWatermarkPolicies();
  const update = useUpdateWatermarkPolicy();
  const del = useDeleteWatermarkPolicy();

  async function handleToggle(id: number, enabled: boolean) {
    try {
      await update.mutateAsync({ id, input: { enabled } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDelete(id: number) {
    try {
      await del.mutateAsync(id);
      toast.success("Watermark policy deleted");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Watermark policies</CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New policy
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {!policies || policies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No watermark policies configured.</p>
        ) : (
          policies.map((policy) => (
            <div key={policy.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{policy.text ?? "Untitled watermark"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  Applies to: {policy.appliesStates.join(", ") || "none"} {policy.showOnFinalPdf ? "· on final PDF" : "· preview only"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={policy.enabled} onCheckedChange={(v) => handleToggle(policy.id, v)} />
                <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDelete(policy.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
      <WatermarkPolicyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Card>
  );
}
