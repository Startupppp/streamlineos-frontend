"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Sparkles } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateLeaveType,
  useDeleteLeaveType,
  useLeaveTypesAdmin,
  useSeedLeaveTypes,
  useUpdateLeaveType,
  type HrLeaveType,
} from "@/hooks/api/hr/leaves";

interface EditorState {
  open: boolean;
  editing: HrLeaveType | null;
  name: string;
  days: string;
  carryForward: boolean;
}

const CLOSED_EDITOR: EditorState = {
  open: false,
  editing: null,
  name: "",
  days: "12",
  carryForward: false,
};

export function LeaveTypesManager({ canManage }: { canManage: boolean }) {
  const { data: types, isLoading, isError, refetch } = useLeaveTypesAdmin();
  const seed = useSeedLeaveTypes();
  const create = useCreateLeaveType();
  const update = useUpdateLeaveType();
  const remove = useDeleteLeaveType();

  const [editor, setEditor] = useState<EditorState>(CLOSED_EDITOR);
  const [deleteTarget, setDeleteTarget] = useState<HrLeaveType | null>(null);

  function handleOpenCreate() {
    setEditor({ ...CLOSED_EDITOR, open: true });
  }

  function handleOpenEdit(type: HrLeaveType) {
    setEditor({
      open: true,
      editing: type,
      name: type.name,
      days: String(type.daysPerYear),
      carryForward: type.carryForward,
    });
  }

  function handleEditorOpenChange(open: boolean) {
    setEditor((prev) => (open ? prev : CLOSED_EDITOR));
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditor((prev) => ({ ...prev, name: e.target.value }));
  }

  function handleDaysChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditor((prev) => ({ ...prev, days: e.target.value }));
  }

  function handleCarryForwardChange(checked: boolean) {
    setEditor((prev) => ({ ...prev, carryForward: checked }));
  }

  function handleSeed() {
    seed.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          result.seeded > 0
            ? `Added ${result.seeded} standard leave type${result.seeded === 1 ? "" : "s"}`
            : "Standard leave types already exist",
        );
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleSave() {
    if (!editor.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const days = parseInt(editor.days, 10);
    if (Number.isNaN(days) || days < 0 || days > 365) {
      toast.error("Days per year must be between 0 and 365");
      return;
    }
    if (editor.editing) {
      update.mutate(
        {
          typeId: editor.editing.id,
          name: editor.name.trim(),
          daysPerYear: days,
          carryForward: editor.carryForward,
        },
        {
          onSuccess: () => {
            toast.success("Leave type updated");
            setEditor(CLOSED_EDITOR);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
      return;
    }
    create.mutate(
      { name: editor.name.trim(), daysPerYear: days, carryForward: editor.carryForward },
      {
        onSuccess: () => {
          toast.success("Leave type created");
          setEditor(CLOSED_EDITOR);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Leave type deleted");
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setDeleteTarget(null);
      },
    });
  }

  function handleDeleteOpenChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  const savePending = create.isPending || update.isPending;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Leave Types</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            The categories employees can request. Policies attach accrual rules to a type.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {(types?.length ?? 0) === 0 && !isLoading && (
              <LoadingButton
                size="sm"
                variant="outline"
                className="gap-1.5"
                isPending={seed.isPending}
                onClick={handleSeed}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Add standard defaults
              </LoadingButton>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleOpenCreate}>
              <PlusIcon size={14} />
              Add leave type
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center justify-between gap-3 p-4">
          <p className="text-xs text-muted-foreground">Couldn&apos;t load leave types.</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (types?.length ?? 0) === 0 ? (
        <div className="p-4">
          <p className="text-xs text-muted-foreground">
            No leave types yet. Add the standard Indian set (Casual, Sick, Earned, Maternity,
            Paternity) with one click, or create your own.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {types?.map((type) => (
            <div key={type.id} className="flex items-center gap-3 px-4 py-2.5">
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {type.name}
              </p>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {type.daysPerYear} days/yr
              </span>
              {type.carryForward && (
                <Badge variant="outline" className="shrink-0 text-micro">
                  Carry forward
                </Badge>
              )}
              {canManage && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7"
                    aria-label={`Edit ${type.name}`}
                    onClick={() => handleOpenEdit(type)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <TooltipIconButton
                    variant="ghost"
                    className="w-7 text-destructive"
                    icon={Trash2Icon}
                    iconSize={13}
                    label={`Delete ${type.name}`}
                    onClick={() => setDeleteTarget(type)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={editor.open} onOpenChange={handleEditorOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editor.editing ? "Edit Leave Type" : "New Leave Type"}</DialogTitle>
            <DialogDescription>
              {editor.editing
                ? "Changes apply to future accruals and new requests."
                : "Create a category employees can request leave against."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="leave-type-name">Name</Label>
              <Input
                id="leave-type-name"
                value={editor.name}
                onChange={handleNameChange}
                placeholder="e.g. Sick Leave"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-type-days">Days per year</Label>
              <Input
                id="leave-type-days"
                type="number"
                min={0}
                max={365}
                value={editor.days}
                onChange={handleDaysChange}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">Carry forward</p>
                <p className="text-xs text-muted-foreground">
                  Unused balance rolls into the next year
                </p>
              </div>
              <Switch checked={editor.carryForward} onCheckedChange={handleCarryForwardChange} />
            </div>
          </div>
          <DialogFooter>
            <LoadingButton size="sm" isPending={savePending} onClick={handleSave}>
              {editor.editing ? "Save changes" : "Create type"}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Leave types with existing requests or attached policies cannot be deleted.
              Employee balances for this type will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={remove.isPending}>
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
