import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { QuestionRow } from "./question-row";
import type { SurveyBuilderQuestion, SurveyBuilderSection } from "@/hooks/api/surveys/builder";

interface SectionCardProps {
  section: SurveyBuilderSection;
  isFirst: boolean;
  isLast: boolean;
  onRenameSection: (sectionId: number, title: string) => void;
  onDeleteSection: (sectionId: number) => void;
  onMoveSectionUp: (sectionId: number) => void;
  onMoveSectionDown: (sectionId: number) => void;
  onAddQuestion: (sectionId: number) => void;
  onEditQuestion: (question: SurveyBuilderQuestion) => void;
  onDuplicateQuestion: (questionId: number) => void;
  onDeleteQuestion: (questionId: number) => void;
  onMoveQuestionUp: (sectionId: number, questionId: number) => void;
  onMoveQuestionDown: (sectionId: number, questionId: number) => void;
}

export function SectionCard({
  section,
  isFirst,
  isLast,
  onRenameSection,
  onDeleteSection,
  onMoveSectionUp,
  onMoveSectionDown,
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
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          className="h-8 max-w-xs font-semibold"
        />
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isFirst} onClick={() => onMoveSectionUp(section.id)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isLast} onClick={() => onMoveSectionDown(section.id)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <AnimatedIconButton icon={Trash2Icon} iconSize={14} iconClassName="text-destructive" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteSection(section.id)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {questions.map((question, index) => (
          <QuestionRow
            key={question.id}
            question={question}
            isFirst={index === 0}
            isLast={index === questions.length - 1}
            onEdit={onEditQuestion}
            onDuplicate={onDuplicateQuestion}
            onDelete={onDeleteQuestion}
            onMoveUp={(questionId) => onMoveQuestionUp(section.id, questionId)}
            onMoveDown={(questionId) => onMoveQuestionDown(section.id, questionId)}
          />
        ))}
        <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" variant="outline" size="sm" onClick={() => onAddQuestion(section.id)}>
          Add question
        </AnimatedIconButton>
      </CardContent>
    </Card>
  );
}
