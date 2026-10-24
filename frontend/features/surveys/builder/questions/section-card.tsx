import type { ChangeEvent } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSourceOverride } from "@/hooks/common/use-source-override";
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
}: SectionCardProps) {
  const [title, setTitle] = useSourceOverride(section.title, section.title);

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }

  function commitTitle() {
    if (title.trim() && title !== section.title) {
      onRenameSection(section.id, title.trim());
    }
  }

  function handleAddQuestion() {
    onAddQuestion(section.id);
  }

  function handleDeleteSection() {
    onDeleteSection(section.id);
  }

  const questions = [...section.questions].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Draggable draggableId={sectionDragId(section.id)} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps}>
          <Card className={cn("min-w-0", snapshot.isDragging && "shadow-lg ring-1 ring-primary/30")}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
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
                  onChange={handleTitleChange}
                  onBlur={commitTitle}
                  className="w-full min-w-0 font-semibold"
                />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <AnimatedIconButton
                  icon={PlusIcon}
                  iconSize={16}
                  variant="outline"
                  size="icon"
                  aria-label="Add question"
                  onClick={handleAddQuestion}
                />
                <AnimatedIconButton
                  icon={Trash2Icon}
                  iconSize={16}
                  variant="destructive"
                  size="icon"
                  aria-label="Delete section"
                  onClick={handleDeleteSection}
                />
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
                        onEdit={onEditQuestion}
                        onDuplicate={onDuplicateQuestion}
                        onDelete={onDeleteQuestion}
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
