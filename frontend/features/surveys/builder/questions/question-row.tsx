import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QUESTION_TYPE_META } from "@/features/surveys/shared/question-type-meta";
import type { SurveyBuilderQuestion } from "@/hooks/api/surveys/builder";

interface QuestionRowProps {
  question: SurveyBuilderQuestion;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (question: SurveyBuilderQuestion) => void;
  onDuplicate: (questionId: number) => void;
  onDelete: (questionId: number) => void;
  onMoveUp: (questionId: number) => void;
  onMoveDown: (questionId: number) => void;
}

export function QuestionRow({
  question,
  isFirst,
  isLast,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: QuestionRowProps) {
  const meta = QUESTION_TYPE_META[question.type];
  const Icon = meta.icon;

  return (
    <div className="group flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 hover:border-primary/30">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <button type="button" onClick={() => onEdit(question)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{question.title || "Untitled question"}</p>
        <p className="text-xs text-muted-foreground">{meta.label}</p>
      </button>
      {question.required && (
        <Badge variant="outline" className="text-xs">Required</Badge>
      )}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isFirst} onClick={() => onMoveUp(question.id)}>
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLast} onClick={() => onMoveDown(question.id)}>
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(question.id)}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(question.id)}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
