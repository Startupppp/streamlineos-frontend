"use client";

import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateMacro,
  useUpdateMacro,
  type MacroActions,
  type MacroVisibility,
  type SupportMacro,
  type TicketPriority,
} from "@/hooks/api/support/macros";
import { getErrorMessage } from "@/lib/get-error-message";
import type { SupportTicketStatus } from "@/types/support";
import {
  isMacroVisibility,
  isTicketPriority,
  isTicketStatus,
  NONE_VALUE,
} from "./macro-constants";
import { MacroActionFields } from "./macro-action-fields";

interface MacroDialogProps {
  macro?: SupportMacro;
  categoryOptions: string[];
  onClose: () => void;
}

export function MacroDialog({
  macro,
  categoryOptions,
  onClose,
}: MacroDialogProps) {
  const [title, setTitle] = useState(macro?.title ?? "");
  const [category, setCategory] = useState(macro?.category ?? "");
  const [body, setBody] = useState(macro?.body ?? "");
  const [visibility, setVisibility] = useState<MacroVisibility>(
    macro?.visibility ?? "org",
  );
  const [setStatus, setSetStatus] = useState<
    SupportTicketStatus | typeof NONE_VALUE
  >(macro?.actions.setStatus ?? NONE_VALUE);
  const [setPriority, setSetPriority] = useState<
    TicketPriority | typeof NONE_VALUE
  >(macro?.actions.setPriority ?? NONE_VALUE);
  const [addTagId, setAddTagId] = useState(
    macro?.actions.addTagId ? String(macro.actions.addTagId) : NONE_VALUE,
  );
  const [actionIsInternal, setActionIsInternal] = useState(
    macro?.actions.isInternal ?? false,
  );
  const create = useCreateMacro();
  const update = useUpdateMacro();
  const isEdit = Boolean(macro);
  const isPending = create.isPending || update.isPending;

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }
  function handleCategoryChange(event: ChangeEvent<HTMLInputElement>) {
    setCategory(event.target.value);
  }
  function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setBody(event.target.value);
  }
  function handleVisibilityChange(value: string) {
    if (isMacroVisibility(value)) setVisibility(value);
  }
  function handleSetStatusChange(value: string) {
    if (value === NONE_VALUE || isTicketStatus(value)) setSetStatus(value);
  }
  function handleSetPriorityChange(value: string) {
    if (value === NONE_VALUE || isTicketPriority(value)) setSetPriority(value);
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;
    const actions: MacroActions = {};
    if (setStatus !== NONE_VALUE) actions.setStatus = setStatus;
    if (setPriority !== NONE_VALUE) actions.setPriority = setPriority;
    if (addTagId !== NONE_VALUE) actions.addTagId = Number(addTagId);
    if (actionIsInternal) actions.isInternal = true;
    const payload = {
      title: trimmedTitle,
      body: trimmedBody,
      category: category.trim() || undefined,
      visibility,
      actions,
    };
    if (macro) {
      update.mutate(
        { id: macro.id, ...payload, category: category.trim() || null },
        {
          onSuccess: () => {
            toast.success("Canned response updated");
            onClose();
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }
    create.mutate(payload, {
      onSuccess: () => {
        toast.success("Canned response created");
        onClose();
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Canned Response" : "New Canned Response"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <MacroTextField
            id="macro-title"
            label="Title *"
            placeholder="e.g. Refund acknowledgement"
            value={title}
            onChange={handleTitleChange}
          />
          <div className="space-y-1">
            <Label htmlFor="macro-category">Category</Label>
            <Input
              id="macro-category"
              list="macro-category-options"
              placeholder="e.g. Billing"
              value={category}
              onChange={handleCategoryChange}
            />
            {categoryOptions.length > 0 ? (
              <datalist id="macro-category-options">
                {categoryOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            ) : null}
            <p className="text-dense text-muted-foreground">
              Pick an existing category to keep grouping consistent, or type a
              new one.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="macro-visibility">Visibility</Label>
            <Select value={visibility} onValueChange={handleVisibilityChange}>
              <SelectTrigger id="macro-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org">Organization</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="private">Private (only me)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="macro-body">Body *</Label>
            <Textarea
              id="macro-body"
              rows={6}
              placeholder="Hi {name}, thanks for reaching out…"
              value={body}
              onChange={handleBodyChange}
            />
          </div>
          <MacroActionFields
            status={setStatus}
            priority={setPriority}
            tagId={addTagId}
            isInternal={actionIsInternal}
            onStatusChange={handleSetStatusChange}
            onPriorityChange={handleSetPriorityChange}
            onTagChange={setAddTagId}
            onInternalChange={setActionIsInternal}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !title.trim() || !body.trim()}
          >
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MacroTextField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
