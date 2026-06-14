"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Star, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  useCsatSurveys,
  useDeleteCsatSurvey,
  type CsatSurvey,
} from "@/lib/api/hooks/crm";
import { toast } from "sonner";
import { CreateSurveySheet } from "@/features/customer-executive/surveys/survey-form-sheet";
import { SurveyList } from "@/features/customer-executive/surveys/survey-list";

export default function CsatSurveysPage() {
  const { data: surveys = [], isLoading } = useCsatSurveys();

  const [createOpen, setCreateOpen] = useState(false);
  const [resultsTarget, setResultsTarget] = useState<CsatSurvey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CsatSurvey | null>(null);

  const deleteMutation = useDeleteCsatSurvey();

  const totalSurveys = surveys.length;
  const totalResponses = surveys.reduce(
    (s, sv) => s + (sv.responseCount ?? 0),
    0
  );
  const surveysWithAvg = surveys.filter(
    (sv) => sv.avgRating != null && (sv.responseCount ?? 0) > 0
  );
  const overallAvg =
    surveysWithAvg.length > 0
      ? surveysWithAvg.reduce((s, sv) => s + (sv.avgRating ?? 0), 0) /
        surveysWithAvg.length
      : null;

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handleCloseResults = useCallback(() => setResultsTarget(null), []);
  const handleCloseDelete = useCallback(() => setDeleteTarget(null), []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Survey deleted");
    } catch {
      toast.error("Failed to delete survey");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation]);

  return (
    <>
      <PageWrapper
        title="CSAT Surveys"
        subtitle="Collect and analyse customer satisfaction scores"
        actions={
          <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
            <Plus className="size-4" />
            New Survey
          </Button>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Surveys"
              value={totalSurveys}
              icon={MessageSquare}
              color="blue"
            />
            <StatCard
              label="Avg CSAT Score"
              value={overallAvg != null ? `${overallAvg.toFixed(1)}/5` : "—"}
              icon={Star}
              color="amber"
            />
            <StatCard
              label="Total Responses"
              value={totalResponses}
              icon={Users}
              color="green"
            />
          </div>

          <SurveyList
            surveys={surveys}
            isLoading={isLoading}
            resultsTarget={resultsTarget}
            deleteTarget={deleteTarget}
            onViewResults={setResultsTarget}
            onDelete={setDeleteTarget}
            onCloseResults={handleCloseResults}
            onCloseDelete={handleCloseDelete}
            onConfirmDelete={handleConfirmDelete}
            isDeleting={deleteMutation.isPending}
          />
        </div>
      </PageWrapper>

      <CreateSurveySheet open={createOpen} onClose={handleCloseCreate} />
    </>
  );
}
