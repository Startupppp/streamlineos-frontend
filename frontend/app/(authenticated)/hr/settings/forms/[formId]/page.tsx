import { requirePermission } from "@/lib/rbac/require-permission";
import { HrFormBuilderContent } from "@/features/hr/forms/components/hr-form-builder-content";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function HrFormBuilderPage({ params }: PageProps) {
  await requirePermission("hr:forms:view");
  const { formId: formIdStr } = await params;
  const formId = parseInt(formIdStr, 10);
  return <HrFormBuilderContent formId={formId} />;
}
