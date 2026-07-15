"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, Pencil, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { EmptyMailIllustration } from "@/components/illustrations";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate, useDeleteEmailTemplate,
} from "@/hooks/api/crm-settings";
import { toast } from "sonner";

const VARIABLES = [
  "{{lead.name}}",
  "{{lead.email}}",
  "{{lead.phone}}",
  "{{lead.company}}",
  "{{lead.city}}",
  "{{lead.source}}",
  "{{lead.potentialValue}}",
  "{{deal.name}}",
  "{{deal.value}}",
  "{{deal.stage}}",
  "{{user.name}}",
  "{{user.email}}",
];

const SAMPLE_DATA: Record<string, string> = {
  "lead.name": "Rahul Sharma",
  "lead.email": "rahul@example.com",
  "lead.phone": "+919876543210",
  "lead.company": "TechCorp India",
  "lead.city": "Mumbai",
  "lead.source": "referral",
  "lead.potentialValue": "50,00,000",
  "deal.name": "Enterprise License",
  "deal.value": "25,00,000",
  "deal.stage": "Proposal",
  "user.name": "Priya Patel",
  "user.email": "priya@streamlineos.app",
};

const TEMPLATE_NAME_INVALID_CHARS = /[<>{}|\\^`]/;

const templateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters")
    .refine((v) => !TEMPLATE_NAME_INVALID_CHARS.test(v), "Name contains invalid special characters (<>{}|\\^`)")
    .refine((v) => !/\s{2,}/.test(v), "Name cannot have consecutive spaces"),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(200, "Subject must be at most 200 characters"),
  body: z
    .string()
    .min(10, "Body must be at least 10 characters"),
});
type TemplateForm = z.infer<typeof templateSchema>;

function interpolate(text: string, data: Record<string, string>) {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

interface TemplateData {
  id: number;
  name: string;
  subject: string;
  body: string;
}

interface TemplateCardProps {
  template: TemplateData;
  onPreviewToggle: (id: number) => void;
  onEdit: (template: TemplateData) => void;
  onDeleteRequest: (id: number) => void;
}

function TemplateCard({ template, onPreviewToggle, onEdit, onDeleteRequest }: TemplateCardProps) {
  const handlePreviewToggle = useCallback(() => onPreviewToggle(template.id), [template.id, onPreviewToggle]);
  const handleEdit = useCallback(() => onEdit(template), [template, onEdit]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(template.id), [template.id, onDeleteRequest]);

  return (
    <Card className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="text-sm truncate min-w-0 cursor-default">{template.name}</CardTitle>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs break-words">{template.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="w-7" onClick={handlePreviewToggle} aria-label="Preview">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7" onClick={handleEdit} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 text-destructive" onClick={handleDeleteRequest} aria-label="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Subject</p>
            <p className="text-xs truncate">{template.subject}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Body</p>
            <p className="text-xs line-clamp-3 whitespace-pre-wrap">{template.body}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface VariableButtonProps {
  variable: string;
  formType: "create" | "edit";
  onInsert: (variable: string, formType: "create" | "edit") => void;
}

function VariableButton({ variable, formType, onInsert }: VariableButtonProps) {
  const handleClick = useCallback(() => onInsert(variable, formType), [variable, formType, onInsert]);
  return (
    <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={handleClick}>
      {variable}
    </Button>
  );
}

export default function EmailTemplatesPage() {
  const { data: templates, isLoading, isError, refetch } = useEmailTemplates({ limit: 50, offset: 0 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();

  const createForm = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: "", subject: "", body: "" },
  });

  const editForm = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
  });

  const onCreateSubmit = useCallback((data: TemplateForm) => {
    createTemplate.mutate(
      data,
      {
        onSuccess: () => { toast.success("Template created"); setCreateOpen(false); createForm.reset(); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [createTemplate, createForm]);

  const onEditSubmit = useCallback((data: TemplateForm) => {
    if (editingId === null) return;
    updateTemplate.mutate(
      { id: editingId, ...data },
      {
        onSuccess: () => { toast.success("Template updated"); setEditingId(null); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [editingId, updateTemplate]);

  const handleStartEdit = useCallback((template: TemplateData) => {
    setEditingId(template.id);
    editForm.reset({ name: template.name, subject: template.subject, body: template.body });
  }, [editForm]);

  const handleInsertVariable = useCallback((variable: string, formType: "create" | "edit") => {
    const f = formType === "create" ? createForm : editForm;
    const current = f.getValues("body");
    f.setValue("body", current + variable);
  }, [createForm, editForm]);

  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteTemplate.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Template deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(err.message); setDeleteTargetId(null); },
    });
  }, [deleteTemplate, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handlePreviewToggle = useCallback((id: number) => {
    setPreviewId((prev) => (prev === id ? null : id));
  }, []);
  const handleCloseEdit = useCallback(() => setEditingId(null), []);
  const handleClosePreview = useCallback(() => setPreviewId(null), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) handleDeleteCancel(); }, [handleDeleteCancel]);

  const previewTemplate = useMemo(() => {
    if (previewId === null || !templates) return null;
    return templates.find(t => t.id === previewId) ?? null;
  }, [previewId, templates]);

  const count = templates?.length ?? 0;

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Template</AlertDialogTitle>
            <AlertDialogDescription>
              This template will be permanently deleted and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageWrapper
        title="Email Templates"
        subtitle={isLoading ? undefined : `${count} template${count !== 1 ? "s" : ""}`}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Email Template</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField control={createForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Welcome Email" maxLength={100} /></FormControl>
                      <FormMessage />
                      <FormDescription className="text-[10px]">{field.value.length}/100 characters</FormDescription>
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="subject" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Welcome to StreamlineOS, {{lead.name}}" maxLength={200} /></FormControl>
                      <FormMessage />
                      <FormDescription className="text-[10px]">{field.value.length}/200 characters</FormDescription>
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="body" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body</FormLabel>
                      <FormControl><Textarea {...field} rows={8} placeholder="Write your email body..." /></FormControl>
                      <FormMessage />
                      <FormDescription className="text-[10px]">{field.value.length} characters (min 10)</FormDescription>
                    </FormItem>
                  )} />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Insert variable:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {VARIABLES.map(v => (
                        <VariableButton key={v} variable={v} formType="create" onInsert={handleInsertVariable} />
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createTemplate.isPending}>
                    {createTemplate.isPending ? "Creating..." : "Create Template"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      >
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : isError ? (
          <EmptyState
            illustration={<EmptyMailIllustration />}
            title="Failed to load email templates"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates && templates.length > 0 ? (
                templates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onPreviewToggle={handlePreviewToggle}
                    onEdit={handleStartEdit}
                    onDeleteRequest={handleDeleteRequest}
                  />
                ))
              ) : (
                <div className="col-span-full">
                  <EmptyState
                    illustration={<EmptyMailIllustration />}
                    title="No email templates"
                    description="Create reusable templates with dynamic variables to speed up outreach."
                    action={{ label: "New Template", onClick: handleOpenCreate }}
                    className={CONTENT_FILL_PANEL}
                  />
                </div>
              )}
            </div>

            {editingId !== null && (
              <Card className="bg-card rounded-lg border border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Edit Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                      <FormField control={editForm.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl><Input {...field} maxLength={100} /></FormControl>
                          <FormMessage />
                          <FormDescription className="text-[10px]">{field.value.length}/100 characters</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="subject" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl><Input {...field} maxLength={200} /></FormControl>
                          <FormMessage />
                          <FormDescription className="text-[10px]">{field.value.length}/200 characters</FormDescription>
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="body" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body</FormLabel>
                          <FormControl><Textarea {...field} rows={8} /></FormControl>
                          <FormMessage />
                          <FormDescription className="text-[10px]">{field.value.length} characters (min 10)</FormDescription>
                        </FormItem>
                      )} />
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Insert variable:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {VARIABLES.map(v => (
                            <VariableButton key={v} variable={v} formType="edit" onInsert={handleInsertVariable} />
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={handleCloseEdit}>Cancel</Button>
                        <Button type="submit" disabled={updateTemplate.isPending}>
                          {updateTemplate.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {previewTemplate && (
              <Card className="bg-card rounded-lg border border-border shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      Preview: {previewTemplate.name}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleClosePreview}>Close</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Subject</p>
                      <p className="text-sm font-medium">{interpolate(previewTemplate.subject, SAMPLE_DATA)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Body</p>
                      <p className="text-sm whitespace-pre-wrap">{interpolate(previewTemplate.body, SAMPLE_DATA)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Preview uses sample data for variable interpolation</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageWrapper>
    </>
  );
}
