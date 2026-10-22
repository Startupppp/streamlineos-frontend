import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrDocumentTemplateDetail } from "@/lib/prefetch/hr-people";
import { EditTemplatePageContent } from "@/features/hr/documents/edit-template-page-content";
import EditTemplateLoading from "./loading";

interface EditTemplatePageProps {
  params: Promise<{ templateId: string }>;
}

async function EditTemplateHydrated({ id }: { id: number }) {
  const state = await prefetchHrDocumentTemplateDetail(id);
  return (
    <HydrationBoundary state={state}>
      <EditTemplatePageContent id={id} />
    </HydrationBoundary>
  );
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  await requirePermission("hr:documents:manage");
  const { templateId } = await params;
  const id = Number(templateId);
  return (
    <Suspense fallback={<EditTemplateLoading />}>
      <EditTemplateHydrated id={id} />
    </Suspense>
  );
}
