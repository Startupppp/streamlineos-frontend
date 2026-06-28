"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Mail, Trash2, Copy, Pencil } from "lucide-react";
import { EmptyMailIllustration } from "@/components/illustrations";

interface EmailTemplate {
  id: number; name: string; subject: string; body: string;
  category: string | null; variables: string[] | null;
  createdAt: string | null;
}

const etKeys = { all: [...queryKeys.hr.all, "email-templates"] as const, list: () => [...etKeys.all, "list"] as const };

const CATEGORIES = ["Onboarding", "Offboarding", "Leave", "Performance", "General", "Recruitment"];

function EmailTemplatesContent() {
  const qc = useQueryClient();

  const { data: templates, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <PageWrapper title="Email Templates" subtitle="Manage HR email templates">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Email Templates"
      subtitle="Manage reusable email templates for HR communications"
      badge={`${templates?.length ?? 0} templates`}
      actions={<Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Template</Button>}
    >
      {!templates?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyMailIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No email templates yet.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t: EmailTemplate) => (
            <Card key={t.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(t)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEdit(t)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-tight truncate" title={t.name}>{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate" title={t.subject}>Subject: {t.subject}</p>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 break-words">{t.body}</p>
                <div className="flex gap-2">
                  {t.category && <Badge variant="outline" className="text-[10px]">{t.category}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={(open) => { if (!open) resetForm(); setSheetOpen(open); }} title={editTemplate ? "Edit Email Template" : "Create Email Template"} onSubmit={handleSave} submitLabel={editTemplate ? "Save Changes" : "Create"} isPending={create.isPending || update.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Template Name</label>
          <Input placeholder="e.g., Welcome Email" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Subject Line</label>
          <Input placeholder="Email subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Body</label>
          <Textarea placeholder="Email body. Use {{name}}, {{date}} as variables..." value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="resize-none w-full" />
        </div>
      </HrSheet>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
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
