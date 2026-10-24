"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getErrorMessage } from "@/lib/get-error-message";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import {
  useSurveyBuilder,
  useCreateSection,
  usePatchSection,
  useDeleteSection,
  useDeleteQuestion,
  useDuplicateQuestion,
  useReorderBuilder,
  type SurveyBuilderData,
  type SurveyBuilderViewQuestion,
} from "@/hooks/api/surveys/builder";
import { SectionCard } from "../questions/section-card";
import { QuestionEditorSheet } from "../questions/question-editor-sheet";
import { SECTION_DND_TYPE, SECTIONS_DROPPABLE_ID, applyBuilderDrop } from "../questions/questions-reorder";

function QuestionsTabSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center">
            <Skeleton className="h-9 w-full rounded-md sm:max-w-xs" />
            <div className="flex items-center gap-2 sm:ml-auto">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="size-9 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function QuestionsTab({ survey }: { survey: SurveyForm }) {
  const surveyId = survey.id;
  const { data: builder, isLoading, isError, error, refetch } = useSurveyBuilder(surveyId);
  const createSection = useCreateSection(surveyId);
  const patchSection = usePatchSection(surveyId);
  const deleteSection = useDeleteSection(surveyId);
  const deleteQuestion = useDeleteQuestion(surveyId);
  const duplicateQuestion = useDuplicateQuestion(surveyId);
  const reorder = useReorderBuilder(surveyId);
  const queryClient = useQueryClient();
  const builderKey = knowledgeAndSurveysQueryKeys.surveys.builder(surveyId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSectionId, setEditorSectionId] = useState<number | null>(null);
  const [editorQuestion, setEditorQuestion] = useState<SurveyBuilderViewQuestion | null>(null);

  const sections = useMemo(
    () => (builder ? [...builder.sections].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [builder],
  );

  const pageState = usePageState({
    permission: "surveys:view",
    isLoading,
    isError: isError || (!isLoading && !builder),
    error,
    isEmpty: Boolean(builder) && sections.length === 0,
  });

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!builder) return;
    const next = applyBuilderDrop(sections, result);
    if (!next) return;
    const previous = builder;
    queryClient.setQueryData<SurveyBuilderData>(builderKey, { ...builder, sections: next.sections });
    reorder.mutate(next.reorder, {
      onError: (error) => {
        queryClient.setQueryData(builderKey, previous);
        toast.error(getErrorMessage(error));
      },
    });
  }, [builder, builderKey, queryClient, reorder, sections]);

  function handleRetry() {
    void refetch();
  }

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
    <PageState
      resolution={pageState}
      loading={<QuestionsTabSkeleton />}
      onRetry={handleRetry}
      className="h-full min-h-0 flex-1"
      views={{
        error: (
          <ErrorState
            className="h-full min-h-full flex-1"
            description="Failed to load questions."
            onRetry={handleRetry}
          />
        ),
      }}
      empty={
        <EmptyState
          title="No sections yet"
          description="Add a section to start building your questions."
          action={{ label: "Add section", onClick: handleAddSection }}
          className="h-full min-h-full flex-1"
        />
      }
    >
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 justify-stretch sm:justify-end">
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            aria-label="Add section"
            onClick={handleAddSection}
            disabled={createSection.isPending}
          >
            Add section
          </AnimatedIconButton>
        </div>
        <ScrollArea fill className="min-h-0 flex-1">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={SECTIONS_DROPPABLE_ID} type={SECTION_DND_TYPE}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-4 pr-3 pb-1"
                >
                  {sections.map((section, index) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      index={index}
                      onRenameSection={handleRenameSection}
                      onDeleteSection={handleDeleteSection}
                      onAddQuestion={openAddQuestion}
                      onEditQuestion={openEditQuestion}
                      onDuplicateQuestion={handleDuplicateQuestion}
                      onDeleteQuestion={handleDeleteQuestion}
                      onMoveQuestionUp={(sectionId, questionId) =>
                        handleMoveQuestion(sectionId, questionId, -1)
                      }
                      onMoveQuestionDown={(sectionId, questionId) =>
                        handleMoveQuestion(sectionId, questionId, 1)
                      }
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </ScrollArea>
        {builder ? (
          <QuestionEditorSheet
            surveyId={surveyId}
            sectionId={editorSectionId}
            question={editorQuestion}
            sections={sections}
            logicRules={builder.logicRules}
            open={editorOpen}
            onOpenChange={setEditorOpen}
          />
        ) : null}
      </div>
    </PageState>
  );
}
