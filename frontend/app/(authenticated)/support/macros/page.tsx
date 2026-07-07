"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import { Plus, Copy, Pencil, Trash2, Search } from "lucide-react";
import {
  useSupportMacros,
  useCreateMacro,
  useUpdateMacro,
  useDeleteMacro,
  useMacroUsage,
  type SupportMacro,
  type MacroVisibility,
  type MacroActions,
  type TicketPriority,
} from "@/hooks/api/support/macros";
import { useSupportTags } from "@/hooks/api/support/tags";
import type { SupportTicketStatus } from "@/types/support";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

const VISIBILITY_LABELS: Record<MacroVisibility, string> = {
  org: "Organization",
  team: "Team",
  private: "Private",
};

const STATUS_OPTIONS: SupportTicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "CLOSED",
];

const PRIORITY_OPTIONS: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const NONE_VALUE = "__none__";

function MacroDialog({
  macro,
  categoryOptions,
  onClose,
}: {
  macro?: SupportMacro;
  categoryOptions: string[];
  onClose: () => void;
}) {
  const isEdit = !!macro;
  const [title, setTitle] = useState(macro?.title ?? "");
  const [category, setCategory] = useState(macro?.category ?? "");
  const [body, setBody] = useState(macro?.body ?? "");
  const [visibility, setVisibility] = useState<MacroVisibility>(macro?.visibility ?? "org");
  const [setStatus, setSetStatus] = useState<SupportTicketStatus | typeof NONE_VALUE>(
    macro?.actions.setStatus ?? NONE_VALUE,
  );
  const [setPriority, setSetPriority] = useState<TicketPriority | typeof NONE_VALUE>(
    macro?.actions.setPriority ?? NONE_VALUE,
  );
  const [addTagId, setAddTagId] = useState<string>(
    macro?.actions.addTagId ? String(macro.actions.addTagId) : NONE_VALUE,
  );
  const [actionIsInternal, setActionIsInternal] = useState(macro?.actions.isInternal ?? false);

  const { data: tags } = useSupportTags();
  const create = useCreateMacro();
  const update = useUpdateMacro();
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
    setVisibility(value as MacroVisibility);
  }

  function handleSetStatusChange(value: string) {
    setSetStatus(value as SupportTicketStatus | typeof NONE_VALUE);
  }

  function handleSetPriorityChange(value: string) {
    setSetPriority(value as TicketPriority | typeof NONE_VALUE);
  }

  function handleAddTagChange(value: string) {
    setAddTagId(value);
  }

  function handleActionIsInternalChange(checked: boolean) {
    setActionIsInternal(checked);
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

    if (isEdit) {
      update.mutate(
        { id: macro.id, ...payload, category: category.trim() || null },
        {
          onSuccess: () => {
            toast.success("Canned response updated");
            onClose();
          },
          onError: (error) => toast.error(getApiError(error)),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success("Canned response created");
          onClose();
        },
        onError: (error) => toast.error(getApiError(error)),
      });
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Canned Response" : "New Canned Response"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="macro-title">Title *</Label>
            <Input
              id="macro-title"
              placeholder="e.g. Refund acknowledgement"
              value={title}
              onChange={handleTitleChange}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="macro-category">Category</Label>
            <Input
              id="macro-category"
              list="macro-category-options"
              placeholder="e.g. Billing"
              value={category}
              onChange={handleCategoryChange}
            />
            {categoryOptions.length > 0 && (
              <datalist id="macro-category-options">
                {categoryOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            )}
            <p className="text-[11px] text-muted-foreground">
              Pick an existing category to keep grouping consistent, or type a new one.
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
          <div className="space-y-3 rounded-md border border-border p-3">
            <p className="text-xs font-medium text-foreground">Actions on apply</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="macro-set-status" className="text-xs">
                  Set status
                </Label>
                <Select value={setStatus} onValueChange={handleSetStatusChange}>
                  <SelectTrigger id="macro-set-status" size="sm">
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No change</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="macro-set-priority" className="text-xs">
                  Set priority
                </Label>
                <Select value={setPriority} onValueChange={handleSetPriorityChange}>
                  <SelectTrigger id="macro-set-priority" size="sm">
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No change</SelectItem>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="macro-add-tag" className="text-xs">
                Add tag
              </Label>
              <Select value={addTagId} onValueChange={handleAddTagChange}>
                <SelectTrigger id="macro-add-tag" size="sm">
                  <SelectValue placeholder="No tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>No tag</SelectItem>
                  {(tags ?? []).map((tag) => (
                    <SelectItem key={tag.id} value={String(tag.id)}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="macro-action-internal"
                checked={actionIsInternal}
                onCheckedChange={handleActionIsInternalChange}
              />
              <Label htmlFor="macro-action-internal" className="text-xs cursor-pointer">
                Post as internal note when applied
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !title.trim() || !body.trim()}>
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MacroCard({
  macro,
  usageCount,
  onCopy,
  onEdit,
  onDelete,
}: {
  macro: SupportMacro;
  usageCount: number;
  onCopy: (macro: SupportMacro) => void;
  onEdit: (macro: SupportMacro) => void;
  onDelete: (macro: SupportMacro) => void;
}) {
  function handleCopy() {
    onCopy(macro);
  }
  function handleEdit() {
    onEdit(macro);
  }
  function handleDelete() {
    onDelete(macro);
  }
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{macro.title}</p>
              {macro.category && (
                <Badge variant="secondary" className="text-[10px]">
                  {macro.category}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {VISIBILITY_LABELS[macro.visibility]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 whitespace-pre-wrap">
              {macro.body}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Used {usageCount} {usageCount === 1 ? "time" : "times"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCopy} aria-label="Copy response">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEdit} aria-label="Edit response">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete response"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SupportMacrosPage() {
  const [search, setSearch] = useState("");
  const { data: macros, isLoading, isError, refetch } = useSupportMacros(
    search.trim() ? { search: search.trim() } : undefined,
  );
  const { data: usageData } = useMacroUsage();
  const deleteMacro = useDeleteMacro();

  const usageById = useMemo(() => {
    const map = new Map<number, number>();
    for (const entry of usageData ?? []) {
      map.set(entry.id, entry.usageCount);
    }
    return map;
  }, [usageData]);

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const macro of macros ?? []) {
      const value = macro.category?.trim();
      if (value && !seen.has(value.toLowerCase())) {
        seen.set(value.toLowerCase(), value);
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [macros]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupportMacro | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupportMacro | null>(null);

  async function handleCopy(macro: SupportMacro) {
    try {
      await navigator.clipboard.writeText(macro.body);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMacro.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Canned response deleted");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getApiError(error)),
    });
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  function handleRetry() {
    void refetch();
  }

  function handleNewResponseAction() {
    setCreateOpen(true);
  }

  function handleEditMacro(macro: SupportMacro) {
    setEditTarget(macro);
  }

  function handleDeleteMacro(macro: SupportMacro) {
    setDeleteTarget(macro);
  }

  function handleCloseCreate() {
    setCreateOpen(false);
  }

  function handleCloseEdit() {
    setEditTarget(null);
  }

  function handleDeleteOpenChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  return (
    <PageWrapper
      title="Canned Responses"
      subtitle="Reusable reply templates for faster support"
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Response
        </Button>
      }
    >
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search responses…"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {isLoading ? (
        <LoadingState variant="cards" rows={6} />
      ) : isError ? (
        <ErrorState onRetry={handleRetry} />
      ) : macros && macros.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {macros.map((macro) => (
            <MacroCard
              key={macro.id}
              macro={macro}
              usageCount={usageById.get(macro.id) ?? macro.usageCount ?? 0}
              onCopy={handleCopy}
              onEdit={handleEditMacro}
              onDelete={handleDeleteMacro}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          illustration={<EmptyMailIllustration />}
          title={search.trim() ? "No matching responses" : "No canned responses yet"}
          description={
            search.trim()
              ? "Try a different search term."
              : "Create reusable reply templates to speed up support."
          }
          action={search.trim() ? undefined : { label: "New Response", onClick: handleNewResponseAction }}
          className="flex-1"
        />
      )}

      {createOpen && (
        <MacroDialog categoryOptions={categoryOptions} onClose={handleCloseCreate} />
      )}
      {editTarget && (
        <MacroDialog
          macro={editTarget}
          categoryOptions={categoryOptions}
          onClose={handleCloseEdit}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete canned response?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
