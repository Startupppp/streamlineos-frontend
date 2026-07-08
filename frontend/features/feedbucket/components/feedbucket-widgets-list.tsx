"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, RefreshCcw, Trash2, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useFeedbucketWidgets,
  useCreateFeedbucketWidget,
  useUpdateFeedbucketWidget,
  useDeleteFeedbucketWidget,
  useRotateFeedbucketWidgetKey,
} from "@/hooks/api/feedbucket/use-feedbucket-widgets";
import { useProjects } from "@/hooks/api/projects/projects";
import type { FeedbucketWidget } from "@/types/feedbucket";

function embedSnippet(publicKey: string): string {
  if (typeof window === "undefined") return `<script src="/feedbucket-widget.js" data-key="${publicKey}" async></script>`;
  return `<script src="${window.location.origin}/feedbucket-widget.js" data-key="${publicKey}" async></script>`;
}

function DomainChips({
  domains,
  onChange,
}: {
  domains: string[];
  onChange: (domains: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      const value = input.trim().replace(/^https?:\/\//, "").split("/")[0];
      if (value && !domains.includes(value)) {
        onChange([...domains, value]);
      }
      setInput("");
    }
    if (e.key === "Backspace" && !input && domains.length > 0) {
      onChange(domains.slice(0, -1));
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
  }

  function handleRemoveDomain(domain: string) {
    onChange(domains.filter((d) => d !== domain));
  }

  return (
    <div className="flex flex-wrap gap-1.5 min-h-9 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
      {domains.map((d) => (
        <Badge key={d} variant="secondary" className="text-xs gap-1">
          {d}
          <button type="button" onClick={() => handleRemoveDomain(d)} className="hover:text-destructive">×</button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder={domains.length === 0 ? "Add domain (e.g. example.com)" : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

interface WidgetFormState {
  name: string;
  projectId: string;
  allowedDomains: string[];
  autoCreateTicket: boolean;
  defaultTicketType: string;
}

const DEFAULT_FORM: WidgetFormState = {
  name: "",
  projectId: "none",
  allowedDomains: [],
  autoCreateTicket: false,
  defaultTicketType: "BUG",
};

function WidgetSheet({
  open,
  onClose,
  editingWidget,
}: {
  open: boolean;
  onClose: () => void;
  editingWidget: FeedbucketWidget | null;
}) {
  const [form, setForm] = useState<WidgetFormState>(
    editingWidget
      ? {
          name: editingWidget.name,
          projectId: editingWidget.projectId ? String(editingWidget.projectId) : "none",
          allowedDomains: editingWidget.allowedDomains,
          autoCreateTicket: editingWidget.autoCreateTicket,
          defaultTicketType: editingWidget.defaultTicketType,
        }
      : DEFAULT_FORM,
  );

  const { data: projectsResult } = useProjects();
  const projects = projectsResult?.data ?? [];
  const createWidget = useCreateFeedbucketWidget();
  const updateWidget = useUpdateFeedbucketWidget();

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, name: e.target.value }));
  }

  function handleProjectChange(value: string) {
    setForm((prev) => ({ ...prev, projectId: value }));
  }

  function handleAutoCreateChange(checked: boolean) {
    setForm((prev) => ({ ...prev, autoCreateTicket: checked }));
  }

  function handleTicketTypeChange(value: string) {
    setForm((prev) => ({ ...prev, defaultTicketType: value }));
  }

  function handleDomainsChange(domains: string[]) {
    setForm((prev) => ({ ...prev, allowedDomains: domains }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      name: form.name.trim(),
      projectId: form.projectId !== "none" ? Number(form.projectId) : null,
      allowedDomains: form.allowedDomains,
      autoCreateTicket: form.autoCreateTicket,
      defaultTicketType: form.defaultTicketType,
    };
    try {
      if (editingWidget) {
        await updateWidget.mutateAsync({ widgetId: editingWidget.id, input });
        toast.success("Widget updated");
      } else {
        await createWidget.mutateAsync(input);
        toast.success("Widget created");
        setForm(DEFAULT_FORM);
      }
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const isPending = createWidget.isPending || updateWidget.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editingWidget ? "Edit Widget" : "New Widget"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="widget-name">Name</Label>
            <Input
              id="widget-name"
              value={form.name}
              onChange={handleNameChange}
              placeholder="My feedback widget"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="widget-project">Project (for tickets)</Label>
            <Select value={form.projectId} onValueChange={handleProjectChange}>
              <SelectTrigger id="widget-project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Allowed Domains</Label>
            <DomainChips domains={form.allowedDomains} onChange={handleDomainsChange} />
            <p className="text-xs text-muted-foreground">Press Enter or comma to add. Leave empty to allow all.</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Auto-create ticket</p>
              <p className="text-xs text-muted-foreground">Create a ticket for each new submission</p>
            </div>
            <Switch checked={form.autoCreateTicket} onCheckedChange={handleAutoCreateChange} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ticket-type">Default ticket type</Label>
            <Select value={form.defaultTicketType} onValueChange={handleTicketTypeChange}>
              <SelectTrigger id="ticket-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["BUG", "TASK", "STORY", "FEATURE"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SheetFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : editingWidget ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function WidgetCard({
  widget,
  onEdit,
}: {
  widget: FeedbucketWidget;
  onEdit: (w: FeedbucketWidget) => void;
}) {
  const rotateKey = useRotateFeedbucketWidgetKey();
  const deleteWidget = useDeleteFeedbucketWidget();
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleCopySnippet() {
    await navigator.clipboard.writeText(embedSnippet(widget.publicKey));
    toast.success("Embed snippet copied");
  }

  function handleOpenEdit() {
    onEdit(widget);
  }

  function handleOpenRotate() {
    setConfirmRotate(true);
  }

  function handleOpenDelete() {
    setConfirmDelete(true);
  }

  async function handleConfirmRotate() {
    try {
      await rotateKey.mutateAsync(widget.id);
      toast.success("Widget key rotated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
    setConfirmRotate(false);
  }

  async function handleConfirmDelete() {
    try {
      await deleteWidget.mutateAsync(widget.id);
      toast.success("Widget deleted");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
    setConfirmDelete(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="font-medium text-sm truncate">{widget.name}</p>
          <p className="text-xs text-muted-foreground">
            {widget.project ? widget.project.name : "No project"} · {widget.isActive ? "Active" : "Inactive"}
          </p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleOpenEdit} title="Edit widget">
            <Settings className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCopySnippet} title="Copy embed snippet">
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleOpenRotate} title="Rotate key">
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={handleOpenDelete} title="Delete widget">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground truncate">
        {widget.publicKey}
      </div>
      {widget.allowedDomains.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {widget.allowedDomains.map((d) => (
            <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
          ))}
        </div>
      )}

      <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate widget key?</AlertDialogTitle>
            <AlertDialogDescription>
              The old key will stop working immediately. Update the embed snippet on your site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRotate} disabled={rotateKey.isPending}>
              Rotate Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete widget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the widget and stop accepting new submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteWidget.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function FeedbucketWidgetsList() {
  const { data: widgets, isLoading, isError, refetch } = useFeedbucketWidgets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<FeedbucketWidget | null>(null);

  function handleOpenCreate() {
    setEditingWidget(null);
    setSheetOpen(true);
  }

  function handleEdit(widget: FeedbucketWidget) {
    setEditingWidget(widget);
    setSheetOpen(true);
  }

  function handleCloseSheet() {
    setSheetOpen(false);
    setEditingWidget(null);
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState description="Failed to load widgets." onRetry={refetch} className="m-4" />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Widget
        </Button>
      </div>

      {widgets && widgets.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {widgets.map((w) => (
            <WidgetCard key={w.id} widget={w} onEdit={handleEdit} />
          ))}
        </div>
      ) : (
        <EmptyState
          illustration={<EmptyTicketIllustration className="h-24 w-24" />}
          title="No widgets yet"
          description="Create a widget to get your embed snippet and start collecting feedback."
          action={{ label: "New Widget", onClick: handleOpenCreate }}
          className="flex-1 py-16"
        />
      )}

      <WidgetSheet open={sheetOpen} onClose={handleCloseSheet} editingWidget={editingWidget} />
    </div>
  );
}
