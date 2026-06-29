"use client";

import { useState, useCallback } from "react";
import {
  Globe,
  Plus,
  Copy,
  Check,
  Trash2,
  Pencil,
  FormInput,
  FileText,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetH@/hooks/api/crm
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  useWebLeadForms,
  useCreateWebLeadForm,
  useUpdateWebLeadForm,
  useDeleteWebLeadForm,
  type WebLeadForm,
  type WebLeadFormField,
} from "@/hooks/api/crm";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Select" },
] as const;

function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function EmbedDialog({
  form,
  open,
  onClose,
}: {
  form: WebLeadForm;
  open: boolean;
  onClose: () => void;
}) {
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [copiedJs, setCopiedJs] = useState(false);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://yourapp.com";

  const iframeSnippet = `<iframe src="${origin}/lead-form/${form.publicToken}" width="100%" height="600" frameborder="0"></iframe>`;
  const jsSnippet = `<script src="${origin}/lead-form/${form.publicToken}/embed.js"></script>\n<div id="streamlineos-form-${form.publicToken}"></div>`;

  const copy = useCallback((text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  }, []);

  const handleCopyIframe = useCallback(() => {
    copy(iframeSnippet, setCopiedIframe);
  }, [copy, iframeSnippet]);

  const handleCopyJs = useCallback(() => {
    copy(jsSnippet, setCopiedJs);
  }, [copy, jsSnippet]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">
            Embed &quot;{form.name}&quot;
          </DialogTitle>
          <DialogDescription>
            Copy a snippet below and paste it into your website. URLs are
            pre-filled with{" "}
            <span className="font-medium text-foreground break-all">
              {origin}
            </span>{" "}
            — update the domain if you embed on a different site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              iFrame Snippet
            </Label>
            <div className="relative">
              <pre className="bg-muted rounded-md p-3 pr-12 text-xs whitespace-pre-wrap break-all">
                {iframeSnippet}
              </pre>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopyIframe}
              >
                {copiedIframe ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              JavaScript Snippet
            </Label>
            <div className="relative">
              <pre className="bg-muted rounded-md p-3 pr-12 text-xs whitespace-pre-wrap break-all">
                {jsSnippet}
              </pre>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopyJs}
              >
                {copiedJs ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FormBuilderProps {
  open: boolean;
  onClose: () => void;
  existing?: WebLeadForm | null;
}

function FormBuilderSheet({ open, onClose, existing }: FormBuilderProps) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [submitMessage, setSubmitMessage] = useState(
    existing?.submitMessage ?? "Thank you! We'll be in touch soon.",
  );
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [fields, setFields] = useState<WebLeadFormField[]>(
    existing?.fields ?? [],
  );

  const create = useCreateWebLeadForm();
  const update = useUpdateWebLeadForm();
  const isPending = create.isPending || update.isPending;

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      {
        name: `field_${prev.length + 1}`,
        label: "",
        type: "text",
        required: false,
      },
    ]);
  }, []);

  const updateField = useCallback(
    (index: number, patch: Partial<WebLeadFormField>) => {
      setFields((prev) =>
        prev.map((f, i) => {
          if (i !== index) return f;
          const updated = { ...f, ...patch };
          if (patch.label !== undefined)
            updated.name = toSnakeCase(patch.label) || `field_${i}`;
          return updated;
        }),
      );
    },
    [],
  );

  const removeField = useCallback((index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Form name is required");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description || undefined,
      fields,
      submitMessage,
      isActive,
    };
    try {
      if (existing) {
        await update.mutateAsync({ id: existing.id, ...payload });
        toast.success("Form updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Form created");
      }
      onClose();
    } catch {
      toast.error("Failed to save form");
    }
  }, [
    name,
    description,
    fields,
    submitMessage,
    isActive,
    existing,
    update,
    create,
    onClose,
  ]);

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (!o) onClose();
    },
    [onClose],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{existing ? "Edit Form" : "Create Web Form"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="form-name">
              Form Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="form-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact Us"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="form-desc">Description</Label>
            <Textarea
              id="form-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Form Fields</Label>
              <Button size="sm" variant="outline" onClick={addField}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Field
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                No fields yet. Click &quot;Add Field&quot; to start.
              </p>
            )}

            <div className="space-y-3">
              {fields.map((field, i) => (
                <div
                  key={i}
                  className="border rounded-md p-3 space-y-2 bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Field label"
                      value={field.label}
                      onChange={(e) =>
                        updateField(i, { label: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Select
                      value={field.type}
                      onValueChange={(v) =>
                        updateField(i, { type: v as WebLeadFormField["type"] })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeField(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id={`req-${i}`}
                      checked={field.required}
                      onCheckedChange={(v) => updateField(i, { required: v })}
                    />
                    <Label htmlFor={`req-${i}`} className="text-xs">
                      Required
                    </Label>
                    <span className="text-xs text-muted-foreground ml-auto">
                      key: {field.name || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="submit-msg">Submit Message</Label>
            <Textarea
              id="submit-msg"
              value={submitMessage}
              onChange={(e) => setSubmitMessage(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is-active">Active (accepts submissions)</Label>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending
              ? "Saving..."
              : existing
                ? "Save Changes"
                : "Create Form"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function WebFormCard({ form }: { form: WebLeadForm }) {
  const [embedOpen, setEmbedOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deleteForm = useDeleteWebLeadForm();

  const handleDelete = useCallback(() => {
    deleteForm.mutate(form.id, {
      onSuccess: () => toast.success("Form deleted"),
      onError: () => toast.error("Failed to delete form"),
    });
  }, [deleteForm, form.id]);

  const handleOpenEmbed = useCallback(() => setEmbedOpen(true), []);
  const handleOpenEdit = useCallback(() => setEditOpen(true), []);
  const handleCloseEmbed = useCallback(() => setEmbedOpen(false), []);
  const handleCloseEdit = useCallback(() => setEditOpen(false), []);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">
              {form.name}
            </CardTitle>
            <Badge
              variant={form.isActive ? "default" : "secondary"}
              className="shrink-0"
            >
              {form.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {form.description && (
            <CardDescription className="line-clamp-2">
              {form.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">
                {form.fields?.length ?? 0}
              </span>{" "}
              fields
            </span>
            <span>
              <span className="font-medium text-foreground">
                {form.totalSubmissions ?? 0}
              </span>{" "}
              submissions
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={handleOpenEmbed}>
              <Globe className="h-3.5 w-3.5 mr-1" /> Get Embed Code
            </Button>
            <Button size="sm" variant="ghost" onClick={handleOpenEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Form</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{form.name}&quot;?
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <EmbedDialog form={form} open={embedOpen} onClose={handleCloseEmbed} />
      <FormBuilderSheet
        open={editOpen}
        onClose={handleCloseEdit}
        existing={form}
      />
    </>
  );
}

function WebFormsLoadingSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48 mt-1" />
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-7 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function WebFormsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: forms = [], isLoading, isError, refetch } = useWebLeadForms();

  const totalSubmissions = forms.reduce(
    (sum, f) => sum + (f.totalSubmissions ?? 0),
    0,
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Web-to-Lead Forms"
      subtitle="Create embeddable forms to capture leads from your website"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Form
        </Button>
      }
    >
      {isLoading ? (
        <WebFormsLoadingSkeleton />
      ) : isError ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard
              label="Total Forms"
              value={0}
              icon={FormInput}
              color="blue"
            />
            <StatCard
              label="Total Submissions"
              value={0}
              icon={BarChart3}
              color="amber"
            />
          </div>
          <ErrorState
            title="Failed to load forms"
            description="An error occurred while loading your web forms. Please try again."
            onRetry={handleRetry}
            className="flex-1"
          />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard
              label="Total Forms"
              value={forms.length}
              icon={FormInput}
              color="blue"
            />
            <StatCard
              label="Total Submissions"
              value={totalSubmissions}
              icon={BarChart3}
              color="amber"
            />
          </div>

          {forms.length === 0 ? (
            <EmptyState
              illustration={
                <FileText className="h-12 w-12 text-muted-foreground" />
              }
              title="No forms yet"
              description="Create your first web form to start capturing leads from your website."
              action={{ label: "Create Form", onClick: handleOpenCreate }}
              className="flex-1 min-h-[50vh]"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map((form) => (
                <WebFormCard key={form.id} form={form} />
              ))}
            </div>
          )}
        </>
      )}

      <FormBuilderSheet open={createOpen} onClose={handleCloseCreate} />
    </PageWrapper>
  );
}
