import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { EditTemplatePageContent } from "@/features/hr/documents/edit-template-page-content";
import EditTemplateLoading from "./loading";

interface EditTemplatePageProps {
  params: Promise<{ templateId: string }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  await requirePermission("hr:documents:manage");
  const { templateId } = await params;
  const id = Number(templateId);
  return (
    <Suspense fallback={<EditTemplateLoading />}>
      <EditTemplatePageContent id={id} />
    </Suspense>
  );
}
