import { requireModulePermission } from "@/lib/rbac/require-permission";
import { SurveyDetailContent } from "@/features/surveys/builder/survey-detail-content";

interface PageProps {
  params: Promise<{ surveyId: string }>;
}

export default async function SurveyDetailPage({ params }: PageProps) {
  await requireModulePermission("surveys", "surveys:view");
  const { surveyId } = await params;
  return <SurveyDetailContent surveyId={Number(surveyId)} />;
}
