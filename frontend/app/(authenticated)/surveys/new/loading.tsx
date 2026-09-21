import { PageWrapper } from "@/components/ui/page-wrapper";
import { TemplatePickerSkeleton } from "@/features/surveys/templates/template-picker-skeleton";

export default function NewSurveyLoading() {
  return (
    <PageWrapper title="Create survey" subtitle="Start from a template or build from scratch." backHref="/surveys">
      <TemplatePickerSkeleton />
    </PageWrapper>
  );
}
