"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import {
  useKbPageTemplates,
  useCreateKbPage,
  useUpdateKbPage,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { KB_TEMPLATES, pageHref } from "@/lib/knowledge-routes";
import {
  STARTER_TEMPLATES,
  deriveContentText,
} from "@/features/wiki/lib/starter-templates";
import { KbLayoutTemplateIcon } from "@/features/wiki/lib/kb-icons";
import type { StarterTemplate } from "@/features/wiki/lib/starter-templates";
import { StarterTemplateCard, TemplateCard } from "./template-cards";

const VALID_TABS = ["starters", "saved"] as const;
type TemplatesTab = (typeof VALID_TABS)[number];

function resolveTab(tabParam: string | null): TemplatesTab {
  return VALID_TABS.find((t) => t === tabParam) ?? "starters";
}

function savedTemplateKey(templateId: number): string {
  return `saved:${templateId}`;
}

function starterTemplateKey(template: StarterTemplate): string {
  return `starter:${template.key}`;
}

function TemplatesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveTab(searchParams.get("tab"));
  const {
    error,
    isError,
    isLoading,
    data: templates = [],
    refetch: refetchTemplates,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useKbPageTemplates();
  const canDelete = useCan("kb:templates:manage");

  const savedTemplatesState = usePageState({
    isLoading,
    isError,
    error,
    isEmpty: templates.length === 0,
  });

  function handleRetryTemplates() {
    void refetchTemplates();
  }

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "starters") params.delete("tab");
    else params.set("tab", value);
    const qs = params.toString();
    router.replace(qs ? `${KB_TEMPLATES}?${qs}` : KB_TEMPLATES, { scroll: false });
  }

  const createPage = useCreateKbPage();
  const updatePage = useUpdateKbPage();

  const [pendingTemplateKey, setPendingTemplateKey] = useState<string | null>(null);

  const handleUseTemplate = useCallback(
    (templateId: number) => {
      setPendingTemplateKey(savedTemplateKey(templateId));
      createPage.mutate(
        { templateId },
        {
          onSuccess: (page) => {
            router.push(pageHref(page.id));
          },
          onError: () => {
            setPendingTemplateKey(null);
            toast.error("Failed to create page from template");
          },
        },
      );
    },
    [createPage, router],
  );

  const handleUseStarter = useCallback(
    (template: StarterTemplate) => {
      setPendingTemplateKey(starterTemplateKey(template));
      createPage.mutate(
        { title: template.name },
        {
          onSuccess: (page) => {
            updatePage.mutate(
              {
                pageId: page.id,
                content: template.content as Record<string, unknown>,
                contentText: deriveContentText(template.content),
                expectedContentRevision: page.contentRevision,
              },
              {
                onSettled: () => {
                  router.push(pageHref(page.id));
                },
              },
            );
          },
          onError: () => {
            setPendingTemplateKey(null);
            toast.error("Failed to create page from starter template");
          },
        },
      );
    },
    [createPage, updatePage, router],
  );

  const subtitle =
    activeTab === "saved"
      ? "Templates created from your wiki pages"
      : "Built-in skeletons ready to use";

  return (
    <PageWrapper
      title="Templates"
      subtitle={subtitle}
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <TabsList>
          <TabsTrigger value="starters">Starters</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>

        <TabsContent value="starters" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STARTER_TEMPLATES.map((template) => (
              <StarterTemplateCard
                key={template.key}
                template={template}
                onUse={handleUseStarter}
                isPending={pendingTemplateKey === starterTemplateKey(template)}
                isDisabled={
                  pendingTemplateKey !== null &&
                  pendingTemplateKey !== starterTemplateKey(template)
                }
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="saved" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <PageState
            resolution={savedTemplatesState}
            onRetry={handleRetryTemplates}
            loading={<TemplatesSkeleton />}
            empty={
              <EmptyState
                illustration={
                  <KbLayoutTemplateIcon className="w-8 text-muted-foreground" />
                }
                title="No saved templates yet"
                description="Save a page as a template to reuse its structure across your wiki."
                className={CONTENT_FILL_PANEL}
              />
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  canDelete={canDelete}
                  onUse={handleUseTemplate}
                  isPending={pendingTemplateKey === savedTemplateKey(template.id)}
                  isDisabled={
                    pendingTemplateKey !== null &&
                    pendingTemplateKey !== savedTemplateKey(template.id)
                  }
                />
              ))}
            </div>
            {hasNextPage ? (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more templates"}
                </Button>
              </div>
            ) : null}
          </PageState>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
