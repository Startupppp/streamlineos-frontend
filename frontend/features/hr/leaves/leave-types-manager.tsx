"use client";

import { useState } from "react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Sparkles } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateLeaveType,
  useDeleteLeaveType,
  useLeaveTypesAdmin,
  useSeedLeaveTypes,
  useUpdateLeaveType,
  type HrLeaveType,
} from "@/hooks/api/hr/leaves";
import {
  leaveTypeFormValues,
  leaveTypeSchema,
  type LeaveTypeFormValues,
} from "@/features/hr/leaves/leave-type-schema";

interface EditorState {
  open: boolean;
  editing: HrLeaveType | null;
}

const CLOSED_EDITOR: EditorState = { open: false, editing: null };

export function LeaveTypesManager({ canManage }: { canManage: boolean }) {
  const { data: types, isLoading, isError, error, refetch } = useLeaveTypesAdmin();
  // GET /hr/leaves/types needs hr:leaves:view: a denied caller must not read
  // "No leave types yet" beside an offer to add the defaults (FE-47).
  const pageState = usePageState({ permission: "hr:leaves:view", isLoading, isError, error });

  function handleRetry() {
    void refetch();
  }
  const seed = useSeedLeaveTypes();
  const create = useCreateLeaveType();
  const update = useUpdateLeaveType();
  const remove = useDeleteLeaveType();

  const [editor, setEditor] = useState<EditorState>(CLOSED_EDITOR);
  const [deleteTarget, setDeleteTarget] = useState<HrLeaveType | null>(null);

  function handleOpenCreate() {
    setEditor({ open: true, editing: null });
  }

  function handleOpenEdit(type: HrLeaveType) {
    setEditor({ open: true, editing: type });
  }

  function handleEditorOpenChange(open: boolean) {
    setEditor((prev) => (open ? prev : CLOSED_EDITOR));
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

  function handleSave(values: LeaveTypeFormValues) {
    const payload = {
      name: values.name,
      daysPerYear: Number(values.daysPerYear),
      carryForward: values.carryForward,
    };
    if (editor.editing) {
      update.mutate(
        { typeId: editor.editing.id, ...payload },
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
    create.mutate(payload, {
      onSuccess: () => {
        toast.success("Leave type created");
        setEditor(CLOSED_EDITOR);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
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

      {pageState.kind !== "ready" && pageState.kind !== "empty" ? (
        <PageState
          resolution={pageState}
          compact
          onRetry={handleRetry}
          loading={
            <div className="space-y-2 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          }
        >
          {null}
        </PageState>
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
                    aria-label={`Edit ${type.name}`}
                    onClick={() => handleOpenEdit(type)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <TooltipIconButton
                    variant="ghost"
                    className="text-destructive"
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

      <EntityFormDialog<LeaveTypeFormValues>
        open={editor.open}
        onOpenChange={handleEditorOpenChange}
        title={editor.editing ? "Edit leave type" : "Add leave type"}
        description={
          editor.editing
            ? "Changes apply to future accruals and new requests."
            : "Create a category employees can request leave against."
        }
        resolver={zodResolver(leaveTypeSchema)}
        defaultValues={leaveTypeFormValues(editor.editing)}
        resetOnOpen
        onSubmit={handleSave}
        isSubmitting={savePending}
        submitLabel={editor.editing ? "Save changes" : "Add leave type"}
        className="sm:max-w-sm"
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sick leave" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="daysPerYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Days per year</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="numeric" min={0} max={365} step={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="carryForward"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                  <div>
                    <FormLabel>Carry forward</FormLabel>
                    <FormDescription>Unused balance rolls into the next year</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </>
        )}
      </EntityFormDialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title={`Delete "${deleteTarget?.name ?? ""}"?`}
        description="Leave types with existing requests or attached policies cannot be deleted. Employee balances for this type will be removed."
        confirmLabel="Delete leave type"
        destructive
        isPending={remove.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
