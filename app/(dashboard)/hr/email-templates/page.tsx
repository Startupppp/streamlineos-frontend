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
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Mail, Trash2, Copy } from "lucide-react";
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

  const remove = useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/hr/email-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: etKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");

  const handleCreate = useCallback(() => {
    if (!name.trim() || !subject.trim() || !body.trim()) { toast.error("Name, subject, and body are required"); return; }
    create.mutate(
      { name: name.trim(), subject: subject.trim(), body: body.trim(), category },
      {
        onSuccess: () => {
          toast.success("Template created"); setSheetOpen(false);
          setName(""); setSubject(""); setBody(""); setCategory("General");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, subject, body, category, create]);

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
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-tight">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Subject: {t.subject}</p>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t.body}</p>
                <div className="flex gap-2">
                  {t.category && <Badge variant="outline" className="text-[10px]">{t.category}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create Email Template" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Template Name</label>
          <Input placeholder="e.g., Welcome Email" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Subject Line</label>
          <Input placeholder="Email subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Body</label>
          <Textarea placeholder="Email body. Use {{name}}, {{date}} as variables..." value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Template"
        description="Are you sure you want to delete this email template?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={remove.isPending}
      />
    </PageWrapper>
  );
}

export default function EmailTemplatesPage() {
  return (
    <DashboardGate allowedRoles={["HR"]}>
      <EmailTemplatesContent />
    </DashboardGate>
  );
}
