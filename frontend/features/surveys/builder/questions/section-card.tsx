import { useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { QuestionRow } from "./question-row";
import { QUESTION_DND_TYPE, questionDroppableId, sectionDragId } from "./questions-reorder";
import type { SurveyBuilderViewQuestion, SurveyBuilderViewSection } from "@/hooks/api/surveys/builder";

interface SectionCardProps {
  section: SurveyBuilderViewSection;
  index: number;
  onRenameSection: (sectionId: number, title: string) => void;
  onDeleteSection: (sectionId: number) => void;
  onAddQuestion: (sectionId: number) => void;
  onEditQuestion: (question: SurveyBuilderViewQuestion) => void;
  onDuplicateQuestion: (questionId: number) => void;
  onDeleteQuestion: (questionId: number) => void;
  onMoveQuestionUp: (sectionId: number, questionId: number) => void;
  onMoveQuestionDown: (sectionId: number, questionId: number) => void;
}

export function SectionCard({
  section,
  index,
  onRenameSection,
  onDeleteSection,
  onAddQuestion,
  onEditQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
  onMoveQuestionUp,
  onMoveQuestionDown,
}: SectionCardProps) {
  const [title, setTitle] = useState(section.title);

  function commitTitle() {
    if (title.trim() && title !== section.title) onRenameSection(section.id, title.trim());
  }

  const questions = [...section.questions].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Draggable draggableId={sectionDragId(section.id)} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps}>
          <Card className={cn("min-w-0", snapshot.isDragging && "shadow-lg ring-1 ring-primary/30")}>
            <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <button
                  type="button"
                  {...provided.dragHandleProps}
                  className="inline-flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                  aria-label={`Drag to reorder ${section.title || "section"}`}
                >
                  <GripVertical className="size-4" aria-hidden="true" />
                </button>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={commitTitle}
                  className="w-full min-w-0 font-semibold sm:max-w-xs"
                />
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" variant="outline" size="sm" onClick={() => onAddQuestion(section.id)}>
                  Add question
                </AnimatedIconButton>
                <AnimatedIconButton icon={Trash2Icon} iconSize={16} iconClassName="text-destructive" variant="ghost" size="icon" aria-label="Delete section" onClick={() => onDeleteSection(section.id)} />
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-2">
              <Droppable droppableId={questionDroppableId(section.id)} type={QUESTION_DND_TYPE}>
                {(dropProvided, dropSnapshot) => (
                  <div
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                    className={cn(
                      "min-w-0 space-y-2 rounded-md",
                      questions.length === 0 && "min-h-12 border border-dashed border-border",
                      dropSnapshot.isDraggingOver && "bg-muted/50",
                    )}
                  >
                    {questions.map((question, questionIndex) => (
                      <QuestionRow
                        key={question.id}
                        question={question}
                        index={questionIndex}
                        isFirst={questionIndex === 0}
                        isLast={questionIndex === questions.length - 1}
                        onEdit={onEditQuestion}
                        onDuplicate={onDuplicateQuestion}
                        onDelete={onDeleteQuestion}
                        onMoveUp={(questionId) => onMoveQuestionUp(section.id, questionId)}
                        onMoveDown={(questionId) => onMoveQuestionDown(section.id, questionId)}
                      />
                    ))}
                    {dropProvided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
