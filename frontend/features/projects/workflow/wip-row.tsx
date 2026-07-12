"use client";

import { memo, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CustomState } from "@/hooks/api/projects/custom-states";
import { useUpdateStatusWip } from "@/hooks/api/projects/workflow";

interface WipRowProps {
  status: CustomState;
  projectId: number;
  canManage: boolean;
}

export const WipRow = memo(function WipRow({ status, projectId, canManage }: WipRowProps) {
  const [value, setValue] = useState(
    status.wipLimit != null ? String(status.wipLimit) : "",
  );
  const savedRef = useRef(status.wipLimit ?? null);
  const updateWip = useUpdateStatusWip(projectId);

  function handleSave() {
    const parsed = value.trim() === "" ? null : parseInt(value, 10);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 1)) {
      toast.error("WIP limit must be a positive number or empty.");
      return;
    }
    if (parsed === savedRef.current) return;
    updateWip.mutate(
      { statusId: status.id, wipLimit: parsed },
      {
        onSuccess: () => {
          savedRef.current = parsed;
          toast.success("WIP limit updated");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
  }

  return (
    <div className="flex items-center justify-between py-2.5 px-1 border-b last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        {status.color && (
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: status.color }}
          />
        )}
        <span className="text-sm font-medium truncate">{status.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {canManage ? (
          <>
            <Input
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="No limit"
              inputMode="numeric"
              className="h-7 w-24 text-xs text-right"
              disabled={updateWip.isPending}
            />
            <LoadingButton
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleSave}
              isPending={updateWip.isPending}
              loadingText="Saving…"
            >
              Save
            </LoadingButton>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            {status.wipLimit != null ? status.wipLimit : "No limit"}
          </span>
        )}
      </div>
    </div>
  );
});
