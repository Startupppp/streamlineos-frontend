"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useDocumentTemplate } from "@/hooks/api/hr/document-templates";
import { TemplateEditor } from "@/features/hr/documents/template-editor";

interface EditTemplatePageContentProps {
  id: number;
}

function EditTemplateSkeleton() {
  return (
    <PageWrapper
      title="Edit Template"
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-5">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-20 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-105 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

export function EditTemplatePageContent({ id }: EditTemplatePageContentProps) {
  const { data: template, isLoading, isError, error, refetch } = useDocumentTemplate(id);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const pageState = usePageState({ permission: "hr:documents:view", isLoading, isError, error });

  if (pageState.kind === "loading") return <EditTemplateSkeleton />;

  if (pageState.kind !== "ready" && pageState.kind !== "empty") {
    return (
      <PageWrapper title="Edit Template" backHref="/hr/documents/templates">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (!template) {
    return (
      <PageWrapper title="Edit Template" backHref="/hr/documents/templates">
        <EmptyState
          className="flex-1"
          illustrationPreset="documents"
          title="Template not found"
          description="This template no longer exists or has been removed."
          action={{ label: "Back to templates", href: "/hr/documents/templates" }}
        />
      </PageWrapper>
    );
  }

  return <TemplateEditor template={template} />;
}
