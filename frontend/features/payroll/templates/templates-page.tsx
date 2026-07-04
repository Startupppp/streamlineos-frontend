"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePayrollTemplates } from "@/hooks/api/payroll";
import { TemplateCard } from "@/features/payroll/shared/template-card";
import { TemplatePreviewSheet } from "@/features/payroll/shared/template-preview-sheet";
import { DuplicateTemplateDialog } from "@/features/payroll/shared/duplicate-template-dialog";
import type { TemplateRow } from "@/types/payroll/setup";
import { Search } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "INDIA", label: "India" },
  { value: "GLOBAL", label: "Global" },
  { value: "STARTUP", label: "Startup" },
];

const COMPLEXITIES = [
  { value: "all", label: "All Complexities" },
  { value: "SIMPLE", label: "Simple" },
  { value: "MODERATE", label: "Moderate" },
  { value: "ADVANCED", label: "Advanced" },
];

export function TemplatesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "all";
  const complexity = searchParams.get("complexity") ?? "all";

  const [searchInput, setSearchInput] = useState(search);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRow | null>(null);
  const [duplicateTemplate, setDuplicateTemplate] = useState<TemplateRow | null>(null);

  const { data, isLoading, isError, refetch } = usePayrollTemplates({
    search: search || undefined,
    category: category === "all" ? undefined : category,
  });

  function updateUrl(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v !== "all") params.set(k, v);
      else params.delete(k);
    });
    router.replace(`/payroll/templates?${params.toString()}`);
  }

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") updateUrl({ search: searchInput });
    },
    [searchInput],
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((value: string) => {
    updateUrl({ category: value });
  }, []);

  const handleComplexityChange = useCallback((value: string) => {
    updateUrl({ complexity: value });
  }, []);

  const handleUseInSetup = useCallback(
    (templateKey: string) => {
      router.push(`/payroll/setup?template=${templateKey}`);
    },
    [router],
  );

  const handlePreviewOpen = useCallback((t: TemplateRow) => {
    setPreviewTemplate(t);
  }, []);

  const handleDuplicateOpen = useCallback((t: TemplateRow) => {
    setDuplicateTemplate(t);
  }, []);

  const handlePreviewOpenChange = useCallback((open: boolean) => {
    if (!open) setPreviewTemplate(null);
  }, []);

  const handleDuplicateOpenChange = useCallback((open: boolean) => {
    if (!open) setDuplicateTemplate(null);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    updateUrl({ search: undefined, category: undefined, complexity: undefined });
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const filteredByComplexity =
    complexity === "all"
      ? (data?.items ?? [])
      : (data?.items ?? []).filter((t) => t.complexity === complexity);

  const total = data?.total ?? 0;
  const hasActiveFilters = !!(search || category !== "all" || complexity !== "all");

  const filters = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={searchInput}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search templates…"
          className="h-8 pl-8 text-sm w-48"
        />
      </div>
      <Select value={category} onValueChange={handleCategoryChange}>
        <SelectTrigger className="h-8 text-sm w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={complexity} onValueChange={handleComplexityChange}>
        <SelectTrigger className="h-8 text-sm w-40">
          <SelectValue placeholder="Complexity" />
        </SelectTrigger>
        <SelectContent>
          {COMPLEXITIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <PageWrapper
        title="Template Library"
        subtitle={
          isLoading ? "Loading…" : `${total} template${total !== 1 ? "s" : ""}`
        }
        filters={filters}
        filtersCollapseBreakpoint="sm"
      >
        {isError ? (
          <EmptyState
            title="Failed to load templates"
            description="There was an error fetching payroll templates."
            action={{ label: "Retry", onClick: handleRetry }}
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border p-4 animate-pulse space-y-3"
              >
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredByComplexity.length === 0 ? (
          <EmptyState
            title="No templates found"
            description={
              hasActiveFilters
                ? "Try adjusting your filters."
                : "No payroll templates are available yet."
            }
            action={
              hasActiveFilters
                ? { label: "Clear filters", onClick: handleClearFilters }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredByComplexity.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => handleUseInSetup(template.key)}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handlePreviewOpen(template)}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleDuplicateOpen(template)}
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs ml-auto"
                      onClick={() => handleUseInSetup(template.key)}
                    >
                      Use in Setup
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </PageWrapper>

      <TemplatePreviewSheet
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={handlePreviewOpenChange}
      />
      <DuplicateTemplateDialog
        template={duplicateTemplate}
        open={!!duplicateTemplate}
        onOpenChange={handleDuplicateOpenChange}
      />
    </>
  );
}
