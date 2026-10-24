import { Draggable } from "@hello-pangea/dnd";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CopyIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { QUESTION_TYPE_META } from "@/features/surveys/shared/question-type-meta";
import type { SurveyBuilderViewQuestion } from "@/hooks/api/surveys/builder";
import { questionDragId } from "./questions-reorder";

interface QuestionRowProps {
  question: SurveyBuilderViewQuestion;
  index: number;
  onEdit: (question: SurveyBuilderViewQuestion) => void;
  onDuplicate: (questionId: number) => void;
  onDelete: (questionId: number) => void;
}

export function QuestionRow({
  question,
  index,
  onEdit,
  onDuplicate,
  onDelete,
}: QuestionRowProps) {
  const meta = QUESTION_TYPE_META[question.type];
  const Icon = meta.icon;

  return (
    <Draggable draggableId={questionDragId(question.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "group flex min-w-0 items-center gap-2 rounded-md border border-border bg-card px-2 py-2 hover:border-primary/30 sm:px-3",
            snapshot.isDragging && "shadow-lg ring-1 ring-primary/30",
          )}
        >
          <button
            type="button"
            {...provided.dragHandleProps}
            className="inline-flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label={`Drag to reorder ${question.title || "question"}`}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="min-w-0 flex-1 text-left"
          >
            <TruncatedText
              text={question.title || "Untitled question"}
              className="text-sm font-medium"
            />
            <p className="text-xs text-muted-foreground">{meta.label}</p>
          </button>
          {question.required ? (
            <Badge variant="outline" className="hidden shrink-0 text-xs sm:inline-flex">
              Required
            </Badge>
          ) : null}
          <div className="hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:flex">
            <AnimatedIconButton
              icon={CopyIcon}
              iconSize={14}
              variant="ghost"
              size="icon"
              aria-label="Duplicate question"
              onClick={() => onDuplicate(question.id)}
            />
            <AnimatedIconButton
              icon={Trash2Icon}
              iconSize={14}
              iconClassName="text-destructive"
              variant="ghost"
              size="icon"
              aria-label="Delete question"
              onClick={() => onDelete(question.id)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 sm:hidden"
                aria-label={`Actions for ${question.title || "question"}`}
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(question)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(question.id)}>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(question.id)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Draggable>
  );
}
