"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import {
  useSurveyBuilder,
  useCreateSection,
  usePatchSection,
  useDeleteSection,
  useDeleteQuestion,
  useDuplicateQuestion,
  useReorderBuilder,
  type SurveyBuilderViewQuestion,
} from "@/hooks/api/surveys/builder";
import { SectionCard } from "../questions/section-card";
import { QuestionEditorSheet } from "../questions/question-editor-sheet";

export function QuestionsTab({ survey }: { survey: SurveyForm }) {
  const surveyId = survey.id;
  const { data: builder, isLoading, isError, refetch } = useSurveyBuilder(surveyId);
  const createSection = useCreateSection(surveyId);
  const patchSection = usePatchSection(surveyId);
  const deleteSection = useDeleteSection(surveyId);
  const deleteQuestion = useDeleteQuestion(surveyId);
  const duplicateQuestion = useDuplicateQuestion(surveyId);
  const reorder = useReorderBuilder(surveyId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSectionId, setEditorSectionId] = useState<number | null>(null);
  const [editorQuestion, setEditorQuestion] = useState<SurveyBuilderViewQuestion | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (isError || !builder) {
    return <ErrorState description="Failed to load questions." onRetry={refetch} />;
  }

  const sections = [...builder.sections].sort((a, b) => a.sortOrder - b.sortOrder);

  async function handleAddSection() {
    try {
      await createSection.mutateAsync({ title: `Section ${sections.length + 1}`, sortOrder: sections.length });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleRenameSection(sectionId: number, title: string) {
    try {
      await patchSection.mutateAsync({ sectionId, input: { title } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDeleteSection(sectionId: number) {
    try {
      await deleteSection.mutateAsync(sectionId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleMoveSection(sectionId: number, direction: -1 | 1) {
    const index = sections.findIndex((s) => s.id === sectionId);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= sections.length) return;
    const a = sections[index];
    const b = sections[swapIndex];
    try {
      await reorder.mutateAsync({
        sections: [
          { id: a.id, sortOrder: b.sortOrder },
          { id: b.id, sortOrder: a.sortOrder },
        ],
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleMoveQuestion(sectionId: number, questionId: number, direction: -1 | 1) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const questions = [...section.questions].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = questions.findIndex((q) => q.id === questionId);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= questions.length) return;
    const a = questions[index];
    const b = questions[swapIndex];
    try {
      await reorder.mutateAsync({
        questions: [
          { id: a.id, sectionId, sortOrder: b.sortOrder },
          { id: b.id, sectionId, sortOrder: a.sortOrder },
        ],
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function openAddQuestion(sectionId: number) {
    setEditorSectionId(sectionId);
    setEditorQuestion(null);
    setEditorOpen(true);
  }

  function openEditQuestion(question: SurveyBuilderViewQuestion) {
    setEditorSectionId(null);
    setEditorQuestion(question);
    setEditorOpen(true);
  }

  async function handleDuplicateQuestion(questionId: number) {
    try {
      await duplicateQuestion.mutateAsync(questionId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDeleteQuestion(questionId: number) {
    try {
      await deleteQuestion.mutateAsync(questionId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      {sections.length === 0 ? (
        <EmptyState
          title="No sections yet"
          description="Add a section to start building your questions."
          action={{ label: "Add section", onClick: handleAddSection }}
          compact
        />
      ) : (
        sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
            onRenameSection={handleRenameSection}
            onDeleteSection={handleDeleteSection}
            onMoveSectionUp={(id) => handleMoveSection(id, -1)}
            onMoveSectionDown={(id) => handleMoveSection(id, 1)}
            onAddQuestion={openAddQuestion}
            onEditQuestion={openEditQuestion}
            onDuplicateQuestion={handleDuplicateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onMoveQuestionUp={(sectionId, questionId) => handleMoveQuestion(sectionId, questionId, -1)}
            onMoveQuestionDown={(sectionId, questionId) => handleMoveQuestion(sectionId, questionId, 1)}
          />
        ))
      )}
      {sections.length > 0 && (
        <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" variant="outline" size="sm" onClick={handleAddSection}>
          Add section
        </AnimatedIconButton>
      )}
      <QuestionEditorSheet
        surveyId={surveyId}
        sectionId={editorSectionId}
        question={editorQuestion}
        sections={sections}
        logicRules={builder.logicRules}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </div>
  );
}
