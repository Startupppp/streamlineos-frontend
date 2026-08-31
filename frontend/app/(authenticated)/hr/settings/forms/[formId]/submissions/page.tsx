import { requirePermission } from "@/lib/rbac/require-permission";
import { HrFormSubmissionsContent } from "@/features/hr/forms/components/hr-form-submissions-content";

interface PageProps {
  params: Promise<{ formId: string }>;
}

export default async function HrFormSubmissionsPage({ params }: PageProps) {
  await requirePermission("hr:forms:view");
  const { formId: formIdStr } = await params;
  const formId = parseInt(formIdStr, 10);
  return <HrFormSubmissionsContent formId={formId} />;
}
