"use client";

import React, { useRef, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Eye, EyeOff, Wand2 } from "lucide-react";
import Link from "next/link";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
  useDocumentTemplateVersions,
  useDocumentTemplates,
  type DocumentTemplate,
} from "@/lib/api/hooks/hr/document-templates";
import { extractVariables, substituteVariables } from "@/lib/utils/document-variables";
import { getErrorMessage } from "@/lib/get-error-message";
import { TEMPLATE_TYPES, SAMPLE_VARS, DEFAULT_HTML } from "./template-constants";
import { TemplateTokenPicker } from "./template-token-picker";
import { TemplatePreviewPanel } from "./template-preview-panel";
import { TemplateVersionHistory } from "./template-version-history";

const templateSchema = z.object({
  title: z
    .string()
    .min(2, "Template name must be at least 2 characters")
    .max(100, "Template name must be at most 100 characters")
    .refine((v) => /[a-zA-Z]/.test(v), { message: "Template name must contain at least one letter" })
    .refine((v) => !/\s{2,}/.test(v), { message: "Template name cannot have consecutive spaces" }),
  type: z.string().min(1, "Type is required"),
  htmlContent: z.string().min(1, "Template content cannot be empty"),
  showPreview: z.boolean(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateEditorProps {
  template?: DocumentTemplate;
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const isEdit = !!template;

  const defaultValues = useMemo<TemplateFormValues>(
    () => ({
      title: template?.title ?? "",
      type: template?.type ?? "OFFER_LETTER",
      htmlContent: template?.htmlContent ?? DEFAULT_HTML.OFFER_LETTER,
      showPreview: false,
    }),
    [template],
  );

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createMutation = useCreateDocumentTemplate();
  const updateMutation = useUpdateDocumentTemplate();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const { data: versionHistory } = useDocumentTemplateVersions(template?.id ?? 0);
  const { data: allTemplates } = useDocumentTemplates();

  const watchedType = form.watch("type");
  const watchedHtml = form.watch("htmlContent");
  const showPreview = form.watch("showPreview");

  const detectedVariables = useMemo(() => extractVariables(watchedHtml), [watchedHtml]);

  const previewHtml = useMemo(() => {
    const { result } = substituteVariables(watchedHtml, SAMPLE_VARS);
    return result;
  }, [watchedHtml]);

  const prevTypeRef = useRef(watchedType);
  useEffect(() => {
    if (!isEdit && prevTypeRef.current !== watchedType) {
      const prev = DEFAULT_HTML[prevTypeRef.current];
      const current = form.getValues("htmlContent");
      if (current === prev) {
        form.setValue("htmlContent", DEFAULT_HTML[watchedType] ?? DEFAULT_HTML.OTHER);
      }
      prevTypeRef.current = watchedType;
    }
  }, [watchedType, isEdit, form]);

  const insertToken = useCallback(
    (token: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const current = form.getValues("htmlContent");
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? start;
      const tokenStr = `{{${token}}}`;
      const newContent = current.slice(0, start) + tokenStr + current.slice(end);
      form.setValue("htmlContent", newContent);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + tokenStr.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [form],
  );

  const handleCancel = useCallback(() => {
    form.reset(defaultValues);
  }, [form, defaultValues]);

  const handleTogglePreview = useCallback(() => {
    form.setValue("showPreview", !form.getValues("showPreview"));
  }, [form]);

  const handleSave = useCallback(
    (values: TemplateFormValues) => {
      const trimmedTitle = values.title.trim();

      const invalidVar = detectedVariables.find(
        (v) => !/^[a-zA-Z][a-zA-Z0-9]*(_[a-zA-Z0-9]+)*$/.test(v),
      );
      if (invalidVar) {
        toast.error(
          `Invalid variable name "{{${invalidVar}}}". Variable names must start with a letter, use only letters/digits/underscores, and cannot have consecutive underscores.`,
        );
        return;
      }

      const isDuplicate = (allTemplates ?? []).some(
        (t) =>
          t.title.trim().toLowerCase() === trimmedTitle.toLowerCase() &&
          t.id !== (template?.id ?? -1),
      );
      if (isDuplicate) {
        form.setError("title", { message: "A template with this name already exists" });
        return;
      }

      const payload = {
        title: trimmedTitle,
        type: values.type,
        htmlContent: values.htmlContent,
        variables: detectedVariables,
      };

      if (isEdit && template) {
        updateMutation.mutate(
          { id: template.id, ...payload },
          {
            onSuccess: () => {
              toast.success("Template updated");
              router.push("/hr/documents/templates");
            },
            onError: (e) => {
              const msg = getErrorMessage(e);
              if (msg.includes("already exists")) {
                form.setError("title", { message: "A template with this name already exists" });
              } else {
                toast.error(msg);
              }
            },
          },
        );
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => {
            toast.success("Template created");
            router.push("/hr/documents/templates");
          },
          onError: (e) => {
            const msg = getErrorMessage(e);
            if (msg.includes("already exists")) {
              form.setError("title", { message: "A template with this name already exists" });
            } else {
              toast.error(msg);
            }
          },
        });
      }
    },
    [detectedVariables, allTemplates, template, isEdit, updateMutation, createMutation, router, form],
  );

  return (
    <Form {...form}>
      <PageWrapper
        title={isEdit ? "Edit Template" : "New Template"}
        subtitle={
          isEdit
            ? `Editing "${template.title}" — v${template.version}`
            : "Create a reusable HTML document template with variable tokens."
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/hr/documents/templates">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="outline" size="sm" onClick={handleTogglePreview} className="gap-2">
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Preview
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={form.handleSubmit(handleSave)}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  {isEdit ? "Save Changes" : "Create Template"}
                </>
              )}
            </Button>
          </div>
        }
      >
        <div
          className={`grid gap-6 ${
            showPreview ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-3xl mx-auto"
          }`}
        >
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Template Details</CardTitle>
                <CardDescription>Basic metadata for this template.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Software Engineer Offer Letter"
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="w-[var(--radix-select-trigger-width)]">
                          {TEMPLATE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <TemplateTokenPicker
              detectedVariables={detectedVariables}
              onInsertToken={insertToken}
            />

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">HTML Content</CardTitle>
                <CardDescription>
                  Write raw HTML. Use{" "}
                  <code className="text-[11px]">{"{{Variable_Name}}"}</code> tokens as
                  placeholders.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="htmlContent"
                  render={({ field: { ref: fieldRef, ...fieldRest } }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          ref={(el) => {
                            textareaRef.current = el;
                            if (typeof fieldRef === "function") fieldRef(el);
                            else if (fieldRef)
                              (
                                fieldRef as React.MutableRefObject<HTMLTextAreaElement | null>
                              ).current = el;
                          }}
                          className="font-mono text-xs min-h-[420px] resize-y"
                          placeholder="<h1>Hello {{Candidate_Name}}</h1>..."
                          spellCheck={false}
                          {...fieldRest}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {isEdit && versionHistory && (
              <TemplateVersionHistory versions={versionHistory} />
            )}
          </div>

          {showPreview && <TemplatePreviewPanel previewHtml={previewHtml} />}
        </div>
      </PageWrapper>
    </Form>
  );
}
