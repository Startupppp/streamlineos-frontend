"use client";

import { useState, useMemo, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateList } from "@/features/settings/email-templates/template-list";
import { TemplateFormSheet } from "@/features/settings/email-templates/template-form-sheet";
import { useEmailTemplatePreviews } from "@/hooks/api/email-templates";

export default function EmailTemplatesPage() {
  const { data: templates = [], isLoading } = useEmailTemplatePreviews();

  const categories = useMemo(
    () => Array.from(new Set(templates.map((t) => t.category))),
    [templates],
  );

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");

  const resolvedCategory = activeCategory || (categories[0] ?? "");

  const categoryTemplates = useMemo(
    () => templates.filter((t) => t.category === resolvedCategory),
    [templates, resolvedCategory],
  );

  const selectedTemplate = useMemo(() => {
    if (selectedId) return templates.find((t) => t.id === selectedId) ?? null;
    return categoryTemplates[0] ?? null;
  }, [selectedId, templates, categoryTemplates]);

  const preview = selectedTemplate
    ? { subject: selectedTemplate.subject, html: selectedTemplate.html }
    : null;

  const handleCategoryChange = useCallback(
    (cat: string) => {
      setActiveCategory(cat);
      const first = templates.find((t) => t.category === cat);
      setSelectedId(first?.id ?? "");
    },
    [templates],
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="Email Templates"
        subtitle="Preview and test all transactional email templates used in the system"
      >
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Email Templates"
      subtitle="Preview and test all transactional email templates used in the system"
      actions={<TemplateFormSheet selectedTemplate={selectedTemplate} />}
    >
      <TemplateList
        activeCategory={resolvedCategory}
        selectedId={selectedTemplate?.id ?? ""}
        preview={preview}
        categories={categories}
        categoryTemplates={categoryTemplates}
        onCategoryChange={handleCategoryChange}
        onSelectId={setSelectedId}
      />
    </PageWrapper>
  );
}
