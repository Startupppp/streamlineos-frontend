"use client";

import { useState, useMemo, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";

import { TemplateList } from "@/features/settings/email-templates/template-list";
import { TemplateFormSheet } from "@/features/settings/email-templates/template-form-sheet";
import { TEMPLATE_REGISTRY, CATEGORIES } from "@/features/settings/email-templates/template-registry";

export default function EmailTemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
  const [selectedId, setSelectedId] = useState<string>("");

  const categoryTemplates = useMemo(
    () => TEMPLATE_REGISTRY.filter((t) => t.category === activeCategory),
    [activeCategory]
  );

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
    const first = TEMPLATE_REGISTRY.find((t) => t.category === cat);
    setSelectedId(first?.id ?? "");
  }, []);

  const selectedTemplate = useMemo(
    () => TEMPLATE_REGISTRY.find((t) => t.id === selectedId) ?? categoryTemplates[0] ?? null,
    [selectedId, categoryTemplates]
  );

  const preview = useMemo(() => {
    if (!selectedTemplate) return null;
    try {
      return selectedTemplate.generate();
    } catch {
      return null;
    }
  }, [selectedTemplate]);

  return (
    <PageWrapper
      title="Email Templates"
      subtitle="Preview and test all transactional email templates used in the system"
      actions={<TemplateFormSheet selectedTemplate={selectedTemplate} />}
    >
      <TemplateList
        activeCategory={activeCategory}
        selectedId={selectedTemplate?.id ?? ""}
        preview={preview}
        categoryTemplates={categoryTemplates}
        onCategoryChange={handleCategoryChange}
        onSelectId={setSelectedId}
      />
    </PageWrapper>
  );
}
