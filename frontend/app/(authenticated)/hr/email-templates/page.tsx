"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Pencil, AlertCircle, Search } from "lucide-react";
import { EmptyMailIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";

interface EmailTemplate {
  id: number; name: string; subject: string; body: string;
  category: string | null; variables: string[] | null;
  createdAt: string | null;
}

const etKeys = { all: [...queryKeys.hr.all, "email-templates"] as const, list: () => [...etKeys.all, "list"] as const };

const CATEGORIES = ["Onboarding", "Offboarding", "Leave", "Performance", "General", "Recruitment"];

const CATEGORY_COLORS: Record<string, string> = {
  Onboarding: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  Offboarding: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  Leave: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  Performance: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  General: "bg-muted text-muted-foreground border-border",
  Recruitment: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30",
};

interface TemplateCardProps {
  template: EmailTemplate;
  onCopy: (t: EmailTemplate) => void;
  onEdit: (t: EmailTemplate) => void;
  onDelete: (id: number) => void;
}

function TemplateCard({ template, onCopy, onEdit, onDelete }: TemplateCardProps) {
  const handleCopy = useCallback(() => onCopy(template), [onCopy, template]);
  const handleEdit = useCallback(() => onEdit(template), [onEdit, template]);
  const handleDelete = useCallback(() => onDelete(template.id), [onDelete, template.id]);

  const categoryKey = template.category ?? "General";
  const categoryClass = CATEGORY_COLORS[categoryKey] ?? CATEGORY_COLORS["General"];
  const varCount = template.variables?.length ?? 0;

  return (
    <Card className="rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border", categoryClass)}>
            {categoryKey}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-sm leading-tight truncate" title={template.name}>
            {template.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate" title={template.subject}>
            <span className="text-muted-foreground">Sub:</span> {template.subject}
          </p>
          <p className="line-clamp-2 text-xs text-muted-foreground mt-1">{template.body}</p>
        </div>
        <div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/20">
            {`{{${varCount}}} variables`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailTemplatesContent() {
  const qc = useQueryClient();

  const { data: templates, isLoading, isError, refetch } = useQuery({
    queryKey: etKeys.list(),
    queryFn: () => apiClient.get<EmailTemplate[]>("/hr/email-templates"),
  });

  const create = useMutation({
    mutationFn: (data: { name: string; subject: string; body: string; category?: string }) =>
      apiClient.post<EmailTemplate>("/hr/email-templates", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: etKeys.list() }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; subject: string; body: string; category?: string }) =>
      apiClient.patch<EmailTemplate>(`/hr/email-templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: etKeys.list() }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/email-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: etKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All" || t.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, activeCategory]);

  const resetForm = useCallback(() => {
    setName(""); setSubject(""); setBody(""); setCategory("General"); setEditTemplate(null);
  }, []);

  const handleOpenEdit = useCallback((t: EmailTemplate) => {
    setEditTemplate(t);
    setName(t.name);
    setSubject(t.subject);
    setBody(t.body);
    setCategory(t.category ?? "General");
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) { toast.error("Template Name is required"); return; }
    if (trimmedName.length < 2) { toast.error("Template Name must be at least 2 characters"); return; }
    if (trimmedName.length > 100) { toast.error("Template Name must be at most 100 characters"); return; }
    if (/\s{2,}/.test(trimmedName)) { toast.error("Template Name cannot have multiple consecutive spaces"); return; }
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) { toast.error("Subject Line is required"); return; }
    if (trimmedSubject.length < 2) { toast.error("Subject must be at least 2 characters"); return; }
    if (trimmedSubject.length > 200) { toast.error("Subject must be at most 200 characters"); return; }
    const trimmedBody = body.trim();
    if (!trimmedBody) { toast.error("Body is required"); return; }
    if (trimmedBody.length < 10) { toast.error("Body must be at least 10 characters"); return; }

    if (editTemplate) {
      update.mutate(
        { id: editTemplate.id, name: trimmedName, subject: trimmedSubject, body: trimmedBody, category },
        {
          onSuccess: () => { toast.success("Template updated"); setSheetOpen(false); resetForm(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
      return;
    }

    const isDuplicate = (templates ?? []).some(
      (t) => t.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) { toast.error("A template with this name already exists"); return; }
    create.mutate(
      { name: trimmedName, subject: trimmedSubject, body: trimmedBody, category },
      {
        onSuccess: () => { toast.success("Template created"); setSheetOpen(false); resetForm(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, subject, body, category, create, update, resetForm, templates, editTemplate]);

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    remove.mutate(deleteId, {
      onSuccess: () => { toast.success("Template deleted"); setDeleteId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, remove]);

  const handleCopy = useCallback((t: EmailTemplate) => {
    navigator.clipboard.writeText(t.body);
    toast.success("Template body copied");
  }, []);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleSheetOpenChange = useCallback((open: boolean) => { if (!open) resetForm(); setSheetOpen(open); }, [resetForm]);
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);
  const handleSubjectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value), []);
  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value), []);
  const handleDeleteDialogOpenChange = useCallback((open: boolean) => { if (!open) setDeleteId(null); }, []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleDeleteTemplate = useCallback((id: number) => setDeleteId(id), []);
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), []);
  const handleSetCategory = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveCategory(e.currentTarget.dataset.category ?? "All");
  }, []);

  if (isLoading) {
    return (
      <PageWrapper title="Email Templates" subtitle="Manage HR email templates">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Email Templates" subtitle="Manage HR email templates">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load email templates</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Email Templates"
      subtitle="Manage reusable email templates for HR communications"
      badge={`${templates?.length ?? 0} templates`}
      actions={
        <Button size="sm" className="h-8 gap-1.5" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5" />
          New Template
        </Button>
      }
    >
      {!templates?.length ? (
        <EmptyState
          illustration={<EmptyMailIllustration className="h-32 w-32" />}
          title="No email templates yet"
          description="Create your first email template to standardize communications."
          action={{ label: "Add Template", onClick: handleOpenSheet }}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap bg-muted/40 rounded-lg px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8 h-8 text-xs w-44"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={handleSetCategory}
                data-category="All"
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-200",
                  activeCategory === "All"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:bg-muted",
                )}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={handleSetCategory}
                  data-category={cat}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-200",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.length === 0 ? (
              <p className="col-span-full text-center text-sm text-muted-foreground py-10">
                No templates match your filters.
              </p>
            ) : (
              filteredTemplates.map((t: EmailTemplate) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onCopy={handleCopy}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteTemplate}
                />
              ))
            )}
          </div>
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={editTemplate ? "Edit Email Template" : "Create Email Template"}
        onSubmit={handleSave}
        submitLabel={editTemplate ? "Save Changes" : "Create"}
        isPending={create.isPending || update.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Template Name</label>
          <Input placeholder="e.g., Welcome Email" value={name} onChange={handleNameChange} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Subject Line</label>
          <Input placeholder="Email subject" value={subject} onChange={handleSubjectChange} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Body</label>
          <Textarea placeholder="Email body. Use {{name}}, {{date}} as variables..." value={body} onChange={handleBodyChange} rows={6} className="resize-none w-full" />
        </div>
      </HrSheet>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete Template"
        description="Are you sure you want to delete this email template?"
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        isPending={remove.isPending}
      />
    </PageWrapper>
  );
}

export default function EmailTemplatesPage() {
  return (
    <DashboardGate permission="hr:documents:manage">
      <EmailTemplatesContent />
    </DashboardGate>
  );
}
