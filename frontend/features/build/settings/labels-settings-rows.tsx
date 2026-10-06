"use client";

import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resolveLabelColor } from "@/components/labels/label-colors";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { TicketLabel } from "@/types/projects";
import { TEXT_BODY, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

function DeleteLabelButton({
  labelName,
  onConfirm,
}: {
  labelName: string;
  onConfirm: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className={cn(
            "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            "h-7 w-7 flex items-center justify-center rounded-md",
            "text-muted-foreground hover:text-status-danger-ink hover:bg-status-danger-surface",
            "transition-all",
          )}
          aria-label={`Delete label ${labelName}`}
          {...hoverHandlers}
        >
          <Trash2Icon ref={iconRef} size={14} />
        </button>
      }
      title="Delete label?"
      description="This removes the label from all tickets."
      confirmLabel="Delete"
      destructive
      onConfirm={onConfirm}
    />
  );
}

function AddLabelButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="shrink-0 gap-1.5 text-xs"
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={14} />
      Add Label
    </Button>
  );
}

export function LabelsHeader({
  showAdd,
  onAdd,
}: {
  showAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3 border-b border-border pb-3">
      <div className="min-w-0">
        <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>Labels</h3>
        <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
          Manage labels for organizing tickets across this organization.
        </p>
      </div>
      {showAdd ? <AddLabelButton onClick={onAdd} /> : null}
    </div>
  );
}

export function LabelListRow({
  label,
  index,
  onEdit,
  onDelete,
  canManage,
}: {
  label: TicketLabel;
  index: number;
  onEdit: (label: TicketLabel) => void;
  onDelete: (id: number) => void;
  canManage: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const color = resolveLabelColor(label.color);

  function handleEdit() {
    onEdit(label);
  }

  function handleDelete() {
    onDelete(label.id);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onEdit(label);
    }
  }

  const labelChip = (
    <>
      <span
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
          "bg-primary/5 border-primary/15",
        )}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full shadow-sm ring-1 ring-background"
          style={{ backgroundColor: color }}
        />
        <span className="truncate">{label.name}</span>
      </span>
      <span className="font-mono text-micro uppercase text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        {color}
      </span>
    </>
  );

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
      transition={{ delay: reduceMotion ? 0 : index * 0.03, duration: 0.18 }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm hover:bg-muted/40 transition-colors group"
    >
      {canManage ? (
        <button
          type="button"
          onClick={handleEdit}
          onKeyDown={handleKeyDown}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Edit label ${label.name}`}
        >
          {labelChip}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {labelChip}
        </div>
      )}
      {canManage ? <DeleteLabelButton labelName={label.name} onConfirm={handleDelete} /> : null}
    </motion.div>
  );
}
