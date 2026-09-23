"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { QUESTION_TYPE_LIST, QUESTION_TYPE_META, type SurveyQuestionType } from "@/features/surveys/shared/question-type-meta";
import { ChoicesEditor } from "./choices-editor";
import { QuestionTypeSettings } from "./question-type-settings";
import { LogicRulesSection } from "./logic-rules-section";
import {
  useCreateQuestion,
  usePatchQuestion,
  type ChoiceInput,
  type SurveyBuilderViewQuestion,
  type SurveyBuilderViewSection,
  type SurveyBuilderLogicRule,
} from "@/hooks/api/surveys/builder";

interface QuestionEditorSheetProps {
  surveyId: number;
  sectionId: number | null;
  question: SurveyBuilderViewQuestion | null;
  sections: SurveyBuilderViewSection[];
  logicRules: SurveyBuilderLogicRule[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuestionEditorSheet({ surveyId, sectionId, question, sections, logicRules, open, onOpenChange }: QuestionEditorSheetProps) {
  const createQuestion = useCreateQuestion(surveyId);
  const patchQuestion = usePatchQuestion(surveyId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SurveyQuestionType>("short_text");
  const [required, setRequired] = useState(false);
  const [variableName, setVariableName] = useState("");
  const [choices, setChoices] = useState<ChoiceInput[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [titleError, setTitleError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevQuestion, setPrevQuestion] = useState(question);
  if (open !== prevOpen || question !== prevQuestion) {
    setPrevOpen(open);
    setPrevQuestion(question);
    if (open) {
      setTitle(question?.title ?? "");
      setDescription(question?.description ?? "");
      setType(question?.type ?? "short_text");
      setRequired(question?.required ?? false);
      setVariableName(question?.variableName ?? "");
      setSettings(question?.settings ?? {});
      setTitleError(null);
      setChoices(
        question?.choices.map((c) => ({
          choiceKey: c.choiceKey,
          label: c.label,
          value: c.value ?? undefined,
          score: c.score ?? undefined,
          isCorrect: c.isCorrect,
        })) ?? [],
      );
    }
  }

  function handleTypeChange(v: string): void {
    const next = QUESTION_TYPE_LIST.find((candidate) => candidate === v);
    if (next) setType(next);
  }

  const meta = QUESTION_TYPE_META[type];
  const isBusy = createQuestion.isPending || patchQuestion.isPending;

  async function handleSave() {
    if (!title.trim() && !meta.isContentOnly) {
      setTitleError("Title is required");
      return;
    }
    setTitleError(null);
    try {
      if (question) {
        await patchQuestion.mutateAsync({
          questionId: question.id,
          input: {
            title,
            description: description || undefined,
            type,
            required,
            variableName: variableName || undefined,
            choices: meta.hasChoices ? choices : undefined,
            settings,
          },
        });
      } else if (sectionId) {
        await createQuestion.mutateAsync({
          sectionId,
          title,
          description: description || undefined,
          type,
          required,
          variableName: variableName || undefined,
          choices: meta.hasChoices ? choices : undefined,
          settings,
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 px-4 py-4 border-b">
          <SheetTitle>{question ? "Edit question" : "Add question"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4 px-4 py-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUESTION_TYPE_LIST.map((t) => (
                  <SelectItem key={t} value={t}>{QUESTION_TYPE_META[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="question-title" className={titleError ? "text-destructive" : undefined}>
              {meta.isContentOnly ? "Content" : "Question title"}
            </Label>
            <Textarea
              id="question-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              rows={2}
              aria-invalid={!!titleError}
              aria-describedby={titleError ? "question-title-error" : undefined}
              className={titleError ? "border-destructive focus-visible:ring-destructive" : undefined}
            />
            {titleError && (
              <p id="question-title-error" className="text-xs text-destructive" role="alert">
                {titleError}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Description / help text</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          {meta.hasChoices && type !== "matrix" && (
            <div className="space-y-1.5">
              <Label>Options</Label>
              <ChoicesEditor choices={choices} onChange={setChoices} showCorrectAnswer showScore />
            </div>
          )}
          {meta.hasChoices && type === "matrix" && (
            <div className="space-y-1.5">
              <Label>Columns</Label>
              <ChoicesEditor choices={choices} onChange={setChoices} />
            </div>
          )}
          <QuestionTypeSettings type={type} settings={settings} onChange={setSettings} />
          {!meta.isContentOnly && (
            <>
              <div className="space-y-1.5">
                <Label>Variable name</Label>
                <Input value={variableName} onChange={(e) => setVariableName(e.target.value)} placeholder="e.g. first_name" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="question-required">Required</Label>
                <Switch id="question-required" checked={required} onCheckedChange={setRequired} />
              </div>
            </>
          )}
          {question && (
            <LogicRulesSection surveyId={surveyId} question={question} sections={sections} rules={logicRules} />
          )}
        </SheetBody>
        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isBusy}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
