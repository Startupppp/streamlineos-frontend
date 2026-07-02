"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Plus,
  Trash2,
  GripVertical,
  PlayCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useProjectTemplates,
  useCreateProjectTemplate,
  useDeleteProjectTemplate,
  useApplyProjectTemplate,
  type ProjectTemplate,
} from "@/hooks/api/projects";
import { toast } from "sonner";

interface TicketDraft {
  title: string;
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  phase: string;
  estimatedHours: string;
  order: number;
}

const CATEGORIES = [
  "GENERAL",
  "SOFTWARE",
  "ONBOARDING",
  "MARKETING",
  "SALES",
  "HR",
] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TICKET_TYPES = ["TASK", "STORY", "BUG", "EPIC"] as const;

function ApplyDialog({
  template,
  onClose,
}: {
  template: ProjectTemplate;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(
    `${template.name} — ${new Date().toLocaleDateString()}`,
  );
  const [description, setDescription] = useState(template.description ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const apply = useApplyProjectTemplate();

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setDescription(e.target.value),
    [],
  );
  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value),
    [],
  );
  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value),
    [],
  );

  const handleApply = useCallback(() => {
    if (!name.trim()) return;
    apply.mutate(
      {
        templateId: template.id,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast.success(
            `Project "${name}" created with ${data.ticketsCreated} tasks! Key: ${data.key}`,
          );
          onClose();
          router.push(`/projects/${data.projectId}`);
        },
        onError: () => toast.error("Failed to create project"),
      },
    );
  }, [
    name,
    description,
    startDate,
    endDate,
    template.id,
    apply,
    onClose,
    router,
  ]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply &ldquo;{template.name}&rdquo;</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Project Name *</Label>
            <Input value={name} onChange={handleNameChange} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={handleDescriptionChange}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
              />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
              />
            </div>
          </div>
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <p className="font-medium">
              {template.tickets.length} tasks will be created:
            </p>
            {template.tickets.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Badge variant="outline" className="text-[10px]">
                  {t.type}
                </Badge>
                <span className="truncate">{t.title}</span>
                {t.phase && (
                  <span className="text-[10px] bg-muted rounded px-1 shrink-0">
                    {t.phase}
                  </span>
                )}
              </div>
            ))}
            {template.tickets.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{template.tickets.length - 5} more
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={apply.isPending || !name.trim()}
          >
            {apply.isPending ? "Creating…" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TicketRowProps {
  ticket: TicketDraft;
  index: number;
  isOnlyTicket: boolean;
  onUpdate: <K extends keyof TicketDraft>(
    idx: number,
    field: K,
    value: TicketDraft[K],
  ) => void;
  onRemove: (idx: number) => void;
}

function TicketRow({
  ticket,
  index,
  isOnlyTicket,
  onUpdate,
  onRemove,
}: TicketRowProps) {
  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, "title", e.target.value);
  }
  function handleTypeChange(v: string) {
    onUpdate(index, "type", v);
  }
  function handlePriorityChange(v: string) {
    onUpdate(index, "priority", v as TicketDraft["priority"]);
  }
  function handleRemove() {
    onRemove(index);
  }
  function handlePhaseChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, "phase", e.target.value);
  }
  function handleEstimatedHoursChange(e: React.ChangeEvent<HTMLInputElement>) {
    onUpdate(index, "estimatedHours", e.target.value);
  }

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          className="flex-1"
          placeholder="Task title *"
          value={ticket.title}
          onChange={handleTitleChange}
        />
        <Select value={ticket.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ticket.priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive shrink-0"
          disabled={isOnlyTicket}
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Input
          className="text-xs"
          placeholder="Phase (e.g. Setup, Development)"
          value={ticket.phase}
          onChange={handlePhaseChange}
        />
        <Input
          type="number"
          min={0}
          className="w-24 text-xs"
          placeholder="Est. hrs"
          value={ticket.estimatedHours}
          onChange={handleEstimatedHoursChange}
        />
      </div>
    </div>
  );
}

function CreateTemplateDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("GENERAL");
  const [tickets, setTickets] = useState<TicketDraft[]>([
    {
      title: "",
      type: "TASK",
      priority: "MEDIUM",
      phase: "",
      estimatedHours: "",
      order: 0,
    },
  ]);
  const create = useCreateProjectTemplate();

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value),
    [],
  );

  const addTicket = useCallback(() => {
    setTickets((prev) => [
      ...prev,
      {
        title: "",
        type: "TASK",
        priority: "MEDIUM",
        phase: "",
        estimatedHours: "",
        order: prev.length,
      },
    ]);
  }, []);

  const removeTicket = useCallback((idx: number) => {
    setTickets((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateTicket = useCallback(
    <K extends keyof TicketDraft>(
      idx: number,
      field: K,
      value: TicketDraft[K],
    ) => {
      setTickets((prev) =>
        prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
      );
    },
    [],
  );

  const handleCreate = useCallback(() => {
    if (!name.trim() || tickets.some((t) => !t.title.trim())) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        tickets: tickets.map((t, i) => ({
          title: t.title.trim(),
          type: t.type,
          priority: t.priority,
          phase: t.phase.trim() || undefined,
          estimatedHours: t.estimatedHours
            ? Number(t.estimatedHours)
            : undefined,
          order: i,
        })),
      },
      {
        onSuccess: () => {
          toast.success("Template created");
          onClose();
        },
        onError: () => toast.error("Failed to create template"),
      },
    );
  }, [name, tickets, description, category, create, onClose]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Project Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g. Software Development"
                value={name}
                onChange={handleNameChange}
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              placeholder="What is this template for?"
              value={description}
              onChange={handleDescriptionChange}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Default Tasks ({tickets.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTicket}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </div>
            {tickets.map((ticket, idx) => (
              <TicketRow
                key={idx}
                ticket={ticket}
                index={idx}
                isOnlyTicket={tickets.length <= 1}
                onUpdate={updateTicket}
                onRemove={removeTicket}
              />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              create.isPending ||
              !name.trim() ||
              tickets.some((t) => !t.title.trim())
            }
          >
            {create.isPending ? "Creating…" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  template,
  onApply,
  onDelete,
}: {
  template: ProjectTemplate;
  onApply: (template: ProjectTemplate) => void;
  onDelete: (template: ProjectTemplate) => void;
}) {
  const handleApply = useCallback(() => onApply(template), [onApply, template]);
  const handleDelete = useCallback(
    () => onDelete(template),
    [onDelete, template],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {template.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="secondary" className="text-[10px]">
              {template.category}
            </Badge>
            <Badge variant="outline">{template.tickets.length} tasks</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          {template.tickets.slice(0, 4).map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-[10px] shrink-0">
                {t.type}
              </Badge>
              <span className="flex-1 truncate text-sm">{t.title}</span>
              {t.phase && (
                <span className="text-[10px] bg-muted rounded px-1 text-muted-foreground shrink-0">
                  {t.phase}
                </span>
              )}
            </div>
          ))}
          {template.tickets.length > 4 && (
            <p className="text-xs text-muted-foreground">
              +{template.tickets.length - 4} more tasks
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1" onClick={handleApply}>
            <PlayCircle className="h-4 w-4 mr-1" /> Use Template
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectTemplatesPage() {
  const { data: templates, isLoading } = useProjectTemplates();
  const deleteTemplate = useDeleteProjectTemplate();
  const [createOpen, setCreateOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<ProjectTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectTemplate | null>(
    null,
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleApplyTarget = useCallback(
    (t: ProjectTemplate) => setApplyTarget(t),
    [],
  );
  const handleDeleteTarget = useCallback(
    (t: ProjectTemplate) => setDeleteTarget(t),
    [],
  );

  function handleCloseCreate() {
    setCreateOpen(false);
  }
  function handleCloseApply() {
    setApplyTarget(null);
  }
  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteTemplate.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete template"),
    });
  }, [deleteTarget, deleteTemplate]);

  return (
    <PageWrapper
      title="Project Templates"
      subtitle={
        templates
          ? `${templates.length} template${templates.length !== 1 ? "s" : ""}`
          : undefined
      }
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Template
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onApply={handleApplyTarget}
              onDelete={handleDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No templates yet"
          description="Create a reusable project structure to bootstrap new projects quickly."
          action={{ label: "Create your first template", onClick: handleOpenCreate }}
          className="flex-1 min-h-[40vh]"
        />
      )}

      {createOpen && <CreateTemplateDialog onClose={handleCloseCreate} />}
      {applyTarget && (
        <ApplyDialog template={applyTarget} onClose={handleCloseApply} />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted.
              Projects created from it will not be affected.
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
