"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Pencil } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { motion } from "framer-motion";

export interface CustomFieldItem {
  id: number;
  name: string;
  type: string;
  options?: string[] | null;
  required?: boolean | null;
}

const fieldTypeColors: Record<string, string> = {
  text: "bg-muted text-muted-foreground",
  number: "bg-category-blue-surface text-category-blue-ink",
  date: "bg-category-amber-surface text-category-amber-ink",
  user: "bg-category-indigo-surface text-category-indigo-ink",
  select: "bg-category-emerald-surface text-category-emerald-ink",
  multi_select: "bg-category-teal-surface text-category-teal-ink",
  checkbox: "bg-category-pink-surface text-category-pink-ink",
  url: "bg-category-sky-surface text-category-sky-ink",
  currency: "bg-category-green-surface text-category-green-ink",
};

interface CustomFieldRowProps {
  field: CustomFieldItem;
  index: number;
  onDelete: (fieldId: number) => void;
  onEdit: (field: CustomFieldItem) => void;
  canManage: boolean;
}

export const CustomFieldRow = memo(function CustomFieldRow({
  field,
  index,
  onDelete,
  onEdit,
  canManage,
}: CustomFieldRowProps) {
  const handleDelete = useCallback(() => onDelete(field.id), [field.id, onDelete]);
  const handleEdit = useCallback(() => onEdit(field), [field, onEdit]);
  const { iconRef: deleteIconRef, hoverHandlers: deleteHoverHandlers } = useAnimatedIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {field.name}
        </p>
        {field.options && field.options.length > 0 && (
          <p className="text-dense text-muted-foreground truncate mt-0.5">
            Options: {field.options.join(", ")}
          </p>
        )}
      </div>
      <Badge
        variant="secondary"
        className={`text-micro shrink-0 ${fieldTypeColors[field.type]}`}
      >
        {field.type.replace("_", " ")}
      </Badge>
      {field.required && (
        <Badge
          variant="outline"
          className="text-micro shrink-0 border-status-danger-rule text-status-danger-ink-strong"
        >
          required
        </Badge>
      )}
      {canManage ? (
        <>
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            aria-label={`Edit field ${field.name}`}
            onClick={handleEdit}
          >
            <Pencil size={14} />
          </button>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="w-7 flex items-center justify-center rounded-lg text-status-danger-ink hover:text-status-danger-ink hover:bg-status-danger-surface transition-colors shrink-0"
                aria-label={`Delete field ${field.name}`}
                {...deleteHoverHandlers}
              >
                <Trash2Icon ref={deleteIconRef} size={14} />
              </button>
            }
            title="Delete custom field?"
            description="This will remove the field and all its values from all tickets. This cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={handleDelete}
          />
        </>
      ) : null}
    </motion.div>
  );
});
