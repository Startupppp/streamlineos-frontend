"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  useCreateCrmPage,
  useUpdateCrmPage,
  type CrmPage,
  type CrmPageTestimonial,
} from "@/lib/api/hooks/marketing";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageBuilderToolbar } from "./page-builder-toolbar";
import { PageBuilderCanvas } from "./page-builder-canvas";
import { AnalyticsPanel, TestimonialsEditor } from "./page-builder-blocks";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function buildPreviewHtml(title: string, description: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title || "Preview"}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111; }
  .hero { background: #0f2b7f; color: #fff; padding: 3rem 1.5rem; text-align: center; }
  .hero h1 { margin: 0 0 0.75rem; font-size: 2rem; font-weight: 700; }
  .hero p { margin: 0; font-size: 1.1rem; opacity: 0.8; }
  .container { max-width: 800px; margin: 0 auto; padding: 2.5rem 1.5rem; }
  .content { line-height: 1.7; }
  .content h1, .content h2, .content h3 { margin-top: 1.5rem; }
  .content p { margin: 0.75rem 0; }
  .content ul, .content ol { padding-left: 1.5rem; }
  .cta-box { margin-top: 2rem; padding: 1.5rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .cta-box h2 { margin: 0 0 0.5rem; font-size: 1.125rem; }
  .cta-box p { margin: 0 0 1rem; font-size: 0.875rem; color: #6b7280; }
  input, textarea { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; margin-bottom: 0.75rem; }
  button { width: 100%; padding: 0.625rem; background: #bd882c; color: #fff; border: none; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>
<div class="hero">
  <h1>${title || "Your Page Title"}</h1>
  ${description ? `<p>${description}</p>` : ""}
</div>
<div class="container">
  ${content ? `<div class="content">${content}</div>` : ""}
  <div class="cta-box">
    <h2>Get in Touch</h2>
    <p>Fill in your details and we'll reach out to you shortly.</p>
    <input placeholder="Your name *" />
    <input placeholder="Email address" />
    <input placeholder="Phone number" />
    <button>Send Message</button>
  </div>
</div>
</body>
</html>`;
}

interface PageBuilderProps {
  page?: CrmPage;
}

export function PageBuilder({ page }: PageBuilderProps) {
  const router = useRouter();
  const isEditing = page !== undefined;

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [description, setDescription] = useState(page?.description ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [isPublished, setIsPublished] = useState(page?.isPublished ?? false);
  const [testimonials, setTestimonials] = useState<CrmPageTestimonial[]>(
    page?.settings?.testimonials ?? [],
  );
  const [showTrustSection, setShowTrustSection] = useState(
    page?.settings?.showTrustSection ?? false,
  );
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "testimonials" | "analytics">("editor");

  const createPage = useCreateCrmPage();
  const updatePage = useUpdateCrmPage();
  const isPending = createPage.isPending || updatePage.isPending;

  useEffect(() => {
    if (!slugTouched && title) {
      setSlug(slugify(title));
    }
  }, [title, slugTouched]);

  const previewHtml = useMemo(
    () => buildPreviewHtml(title, description, content),
    [title, description, content],
  );

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    setSlug(slugify(e.target.value));
  }, []);

  const handleSave = useCallback(
    (publish?: boolean) => {
      const effectivePublished = publish !== undefined ? publish : isPublished;
      if (!title.trim()) { toast.error("Title is required."); return; }
      if (!slug.trim()) { toast.error("Slug is required."); return; }

      const settings = { testimonials, showTrustSection };

      if (isEditing) {
        updatePage.mutate(
          {
            id: page.id,
            title: title.trim(),
            slug,
            description: description.trim() || null,
            content: content || null,
            isPublished: effectivePublished,
            settings,
          },
          {
            onSuccess: () => {
              toast.success(effectivePublished ? "Page saved and published." : "Page saved.");
              setIsPublished(effectivePublished);
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      } else {
        createPage.mutate(
          {
            title: title.trim(),
            slug,
            description: description.trim() || undefined,
            content: content || undefined,
            isPublished: effectivePublished,
          },
          {
            onSuccess: (created) => {
              toast.success("Landing page created.");
              router.push(`/marketing/landing-pages/${created.id}/edit`);
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      }
    },
    [isEditing, page, title, slug, description, content, isPublished, testimonials, showTrustSection, createPage, updatePage, router],
  );

  const publicUrl = slug ? `/${slug}` : null;

  const handleTogglePreview = useCallback(() => setShowPreview((p) => !p), []);
  const handleSaveDraft = useCallback(() => handleSave(false), [handleSave]);
  const handlePublish = useCallback(() => handleSave(true), [handleSave]);
  const handleTogglePublish = useCallback((checked: boolean) => handleSave(checked), [handleSave]);
  const handleTabChange = useCallback(
    (v: string) => setActiveTab(v as "editor" | "testimonials" | "analytics"),
    [],
  );

  return (
    <PageWrapper
      title={isEditing ? (page.title ?? "Edit Page") : "New Landing Page"}
      subtitle={
        isEditing
          ? `Editing /${page.slug ?? ""}`
          : "Build a CRM-hosted landing page"
      }
      actions={
        <PageBuilderToolbar
          isEditing={isEditing}
          isPublished={isPublished}
          showPreview={showPreview}
          isPending={isPending}
          publicUrl={publicUrl}
          slug={slug}
          onTogglePreview={handleTogglePreview}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          onTogglePublish={handleTogglePublish}
        />
      }
    >
      {isEditing ? (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <PageBuilderCanvas
              title={title}
              slug={slug}
              description={description}
              content={content}
              showPreview={showPreview}
              previewHtml={previewHtml}
              onTitleChange={setTitle}
              onSlugChange={handleSlugChange}
              onDescriptionChange={setDescription}
              onContentChange={setContent}
            />
          </TabsContent>

          <TabsContent value="testimonials">
            <TestimonialsEditor
              testimonials={testimonials}
              setTestimonials={setTestimonials}
              showTrustSection={showTrustSection}
              setShowTrustSection={setShowTrustSection}
              onSave={() => handleSave()}
              isSaving={isPending}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Page Analytics (Last 30 Days)</CardTitle>
                <CardDescription>
                  Views, lead conversions, device breakdown, and UTM source attribution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsPanel pageId={page.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <PageBuilderCanvas
          title={title}
          slug={slug}
          description={description}
          content={content}
          showPreview={showPreview}
          previewHtml={previewHtml}
          onTitleChange={setTitle}
          onSlugChange={handleSlugChange}
          onDescriptionChange={setDescription}
          onContentChange={setContent}
        />
      )}
    </PageWrapper>
  );
}
