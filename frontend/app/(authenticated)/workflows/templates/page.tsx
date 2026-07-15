"use client";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import {
  useWorkflowTemplates,
  useCreateWorkflow,
  type WorkflowTemplate,
} from "@/hooks/api/workflows";

function TemplateCard({
  template,
  onUse,
  isUsing,
}: {
  template: WorkflowTemplate;
  onUse: (t: WorkflowTemplate) => void;
  isUsing: boolean;
}) {
  function handleUse() {
    onUse(template);
  }

  return (
    <Card className="bg-card rounded-xl border border-border shadow-sm flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {template.category}
          </Badge>
        </div>
        {template.description && (
          <CardDescription className="text-xs leading-snug line-clamp-2">
            {template.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0 mt-auto">
        <Button
          size="sm"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all duration-200"
          onClick={handleUse}
          disabled={isUsing}
        >
          {isUsing ? "Creating..." : "Use Template"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function WorkflowTemplatesPage() {
  const router = useRouter();
  const { data: templates, isLoading, isError, refetch } = useWorkflowTemplates();
  const createWorkflow = useCreateWorkflow();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!templates) return [];
    return Array.from(new Set(templates.map((t) => t.category)));
  }, [templates]);

  const filtered = useMemo(() => {
    if (!templates) return [];
    return templates.filter((t) => {
      const matchesSearch =
        search === "" ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesCategory = activeCategory === "all" || t.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, search, activeCategory]);

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleCategoryChange(cat: string) {
    setActiveCategory(cat);
  }

  function handleUseTemplate(template: WorkflowTemplate) {
    setUsingTemplateId(template.id);
    createWorkflow.mutate(
      { name: template.name },
      {
        onSuccess: (workflow) => {
          toast.success(`Created "${workflow.name}" from template`);
          router.push(`/workflows/${workflow.id}`);
        },
        onError: () => {
          toast.error("Failed to create workflow from template");
          setUsingTemplateId(null);
        },
      },
    );
  }

  function handleRetry() {
    void refetch();
  }

  const filtersBar = (
    <div className="flex items-center gap-3 flex-wrap w-full">
      <div className="min-w-0 flex-1 min-w-[200px] max-w-xs">
          <SearchInput placeholder="Search templates..." value={search} onValueChange={handleSearchChange} />
        </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleCategoryChange("all")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            activeCategory === "all"
              ? "bg-primary/10 text-foreground border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              activeCategory === cat
                ? "bg-primary/10 text-foreground border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Workflow Templates"
      subtitle="Start with a pre-built template or create from scratch"
      filters={filtersBar}
    >
      {isLoading ? (
        <LoadingState variant="cards" rows={9} />
      ) : isError ? (
        <ErrorState title="Failed to load templates" onRetry={handleRetry} className={CONTENT_FILL_PANEL} />
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title={search ? "No templates match your search" : "No templates available"}
          description={
            search
              ? "Try a different search term or category."
              : "Templates will appear here once added."
          }
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={handleUseTemplate}
              isUsing={usingTemplateId === template.id}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
