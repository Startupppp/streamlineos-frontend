"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { useState, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/components/shared/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { toast } from "sonner";
import { Pencil, Sparkles } from "lucide-react";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { CopyIcon, Trash2Icon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { FilterPill, FilterPillGroup } from "@/components/ui/filter-pill";
import { EmptyMailIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import {
  useEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  useGenerateAiEmailTemplate,
  type EmailTemplate,
} from "@/hooks/api/hr/email-templates";

const CATEGORIES = ["Onboarding", "Offboarding", "Leave", "Performance", "General", "Recruitment"];

const CATEGORY_COLORS: Record<string, string> = {
  Onboarding: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  Offboarding: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  Leave: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  Performance: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  General: "bg-muted text-muted-foreground border-border",
  Recruitment: "bg-status-info-surface text-status-info-ink border-status-info-rule",
};

interface TemplateCardProps {
  template: EmailTemplate;
  onCopy: (t: EmailTemplate) => void;
  onEdit: (t: EmailTemplate) => void;
  onDelete: (id: number) => void;
  canManage: boolean;
}

function TemplateCard({ template, onCopy, onEdit, onDelete, canManage }: TemplateCardProps) {
  const handleCopy = useCallback(() => onCopy(template), [onCopy, template]);
  const handleEdit = useCallback(() => onEdit(template), [onEdit, template]);
  const handleDelete = useCallback(() => onDelete(template.id), [onDelete, template.id]);

  const categoryKey = template.category ?? "General";
  const categoryClass = CATEGORY_COLORS[categoryKey] ?? CATEGORY_COLORS["General"];
  const varCount = template.variables?.length ?? 0;

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center text-micro font-semibold px-2 py-0.5 rounded-full border", categoryClass)}>
            {categoryKey}
          </span>
          <div className="flex gap-1">
            <AnimatedIconButton icon={CopyIcon} variant="ghost" size="icon" className="h-6 w-6" iconSize={12} onClick={handleCopy} aria-label="Copy template body" />
            {canManage && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEdit} aria-label={`Edit ${template.name}`}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <AnimatedIconButton icon={Trash2Icon} variant="ghost" size="icon" className="h-6 w-6 text-destructive" iconSize={12} onClick={handleDelete} aria-label={`Delete ${template.name}`} />
              </>
            )}
          </div>
        </div>
        <div>
          <TruncatedText text={template.name} className="font-semibold text-sm leading-tight" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <span className="text-muted-foreground shrink-0">Sub:</span>
            <TruncatedText text={template.subject} className="text-xs text-muted-foreground" />
          </div>
          <TruncatedText text={template.body} lines={2} className="text-xs text-muted-foreground mt-1" />
        </div>
        <div>
          <span className="text-micro font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-foreground border-primary/20">
            {`${varCount} variable${varCount === 1 ? "" : "s"}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function EmailTemplatesPageClient() {
  const { data: templates, isLoading, isError, error, refetch } = useEmailTemplates();
  const pageState = usePageState({ permission: "hr:email-templates:manage", isLoading, isError, error });
  const canManage = useCan("hr:email-templates:manage");

  const create = useCreateEmailTemplate();
  const update = useUpdateEmailTemplate();
  const remove = useDeleteEmailTemplate();
  const generateAi = useGenerateAiEmailTemplate();

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
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) { toast.error("Subject Line is required"); return; }
    if (trimmedSubject.length < 2) { toast.error("Subject must be at least 2 characters"); return; }
    if (trimmedSubject.length > 200) { toast.error("Subject must be at most 200 characters"); return; }
    const trimmedBody = body.trim();
    if (!trimmedBody) { toast.error("Body is required"); return; }
    if (trimmedBody.length < 10) { toast.error("Body must be at least 10 characters"); return; }

    if (editTemplate) {
      update.mutate(
        { emailTemplateId: editTemplate.id, name: trimmedName, subject: trimmedSubject, body: trimmedBody, category },
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
  const handleSearchChange = useCallback((value: string) => setSearchQuery(value), []);

  const handleGenerateAi = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) { toast.error("Enter a template name first so AI knows what to generate"); return; }
    generateAi.mutate(
      { name: trimmedName, subject: subject.trim() || undefined, category },
      {
        onSuccess: (result) => {
          setSubject(result.subject);
          setBody(result.body);
          toast.success("AI content generated — review and edit before saving");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [generateAi, name, subject, category]);

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    // Was a hand-rolled "Something went wrong" that dropped the error (FE-41).
    return (
      <PageWrapper title="Email Templates" subtitle="Manage reusable email templates for HR communications">
        <PageState
          resolution={pageState}
          onRetry={handleRetry}
          className="flex-1"
          loading={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          }
        >
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Email Templates"
      subtitle="Manage reusable email templates for HR communications"
      actions={
        canManage ? (
          <AnimatedIconButton icon={PlusIcon} size="sm" className="gap-1.5" iconSize={14} onClick={handleOpenSheet}>
            New Template
          </AnimatedIconButton>
        ) : undefined
      }
    >
      {!templates?.length ? (
        <EmptyState
          illustration={<EmptyMailIllustration className="h-32 w-32" />}
          title="No email templates yet"
          description="Create your first email template to standardize communications."
          action={canManage ? { label: "New Template", onClick: handleOpenSheet } : undefined}
          actionVariant="outline"
        />
      ) : (
        <div className="space-y-3">
          <div className={FILTER_TOOLBAR_ROW}>
            <SearchInput placeholder="Search templates..." value={searchQuery} onValueChange={handleSearchChange} />
            <FilterPillGroup className="flex-wrap">
              <FilterPill active={activeCategory === "All"} onClick={() => setActiveCategory("All")}>
                All
              </FilterPill>
              {CATEGORIES.map((cat) => (
                <FilterPill key={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)}>
                  {cat}
                </FilterPill>
              ))}
            </FilterPillGroup>
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
                  canManage={canManage}
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
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">Subject Line</label>
            <Input placeholder="Email subject" value={subject} onChange={handleSubjectChange} />
          </div>
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 shrink-0"
            onClick={handleGenerateAi}
            isPending={generateAi.isPending}
            loadingText="Generating..."
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate with AI
          </LoadingButton>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Body</label>
          <Textarea placeholder="Email body. Use {{name}}, {{date}} as variables..." value={body} onChange={handleBodyChange} rows={6} className="resize-none w-full" />
        </div>
      </HrSheet>

      <ConfirmSheet
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
