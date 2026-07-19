"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { RequireModule } from "@/components/auth/require-module";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiError } from "@/lib/api-client";
import { useCreateSurvey, useSurveyTemplates, type SurveyMode } from "@/hooks/api/surveys/forms";
import { SURVEY_MODE_META } from "@/features/surveys/shared/survey-mode-meta";
import { TemplatePickerCard } from "@/features/surveys/templates/template-picker-card";

const CORE_MODES: SurveyMode[] = ["survey", "assessment", "live_session", "lead_qualification"];

export default function NewSurveyPage() {
  const router = useRouter();
  const { data: templates, isLoading } = useSurveyTemplates();
  const createSurvey = useCreateSurvey();

  async function startFrom(templateKey: string | undefined, mode: SurveyMode, title: string) {
    try {
      const survey = await createSurvey.mutateAsync({ title, mode, templateKey });
      router.push(`/surveys/${survey.id}`);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  const customTemplates = (templates ?? []).filter((t) => !t.key.startsWith("blank_"));

  return (
    <DashboardGate permission="surveys:create">
      <RequireModule module="SURVEYS">
        <PageWrapper
          title="New Survey"
          subtitle="Start from a template or build from scratch."
          backHref="/surveys"
        >
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 flex-col gap-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Start from scratch</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {CORE_MODES.map((mode) => {
                    const meta = SURVEY_MODE_META[mode];
                    return (
                      <TemplatePickerCard
                        key={mode}
                        icon={meta.icon}
                        title={meta.label}
                        description={meta.description}
                        disabled={createSurvey.isPending}
                        onClick={() => startFrom(`blank_${mode}`, mode, meta.label)}
                      />
                    );
                  })}
                </div>
              </div>

              {customTemplates.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Templates</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {customTemplates.map((template) => {
                      const meta = SURVEY_MODE_META[template.mode];
                      return (
                        <TemplatePickerCard
                          key={template.key}
                          icon={meta.icon}
                          title={template.name}
                          description={template.description}
                          disabled={createSurvey.isPending}
                          onClick={() => startFrom(template.key, template.mode, template.name)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </PageWrapper>
      </RequireModule>
    </DashboardGate>
  );
}
