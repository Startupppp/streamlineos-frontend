"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
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
import { getApiError } from "@/lib/api-client";
import { QUESTION_TYPE_LIST, QUESTION_TYPE_META, type SurveyQuestionType } from "@/features/surveys/shared/question-type-meta";
import { ChoicesEditor } from "./choices-editor";
import {
  useCreateQuestion,
  usePatchQuestion,
  type ChoiceInput,
  type SurveyBuilderQuestion,
} from "@/hooks/api/surveys/builder";

interface QuestionEditorSheetProps {
  surveyId: number;
  sectionId: number | null;
  question: SurveyBuilderQuestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuestionEditorSheet({ surveyId, sectionId, question, open, onOpenChange }: QuestionEditorSheetProps) {
  const createQuestion = useCreateQuestion(surveyId);
  const patchQuestion = usePatchQuestion(surveyId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SurveyQuestionType>("short_text");
  const [required, setRequired] = useState(false);
  const [variableName, setVariableName] = useState("");
  const [choices, setChoices] = useState<ChoiceInput[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(question?.title ?? "");
    setDescription(question?.description ?? "");
    setType(question?.type ?? "short_text");
    setRequired(question?.required ?? false);
    setVariableName(question?.variableName ?? "");
    setChoices(
      question?.choices.map((c) => ({
        choiceKey: c.choiceKey,
        label: c.label,
        value: c.value ?? undefined,
        score: c.score ?? undefined,
        isCorrect: c.isCorrect,
      })) ?? [],
    );
  }, [open, question]);

  const meta = QUESTION_TYPE_META[type];
  const isBusy = createQuestion.isPending || patchQuestion.isPending;

  async function handleSave() {
    if (!title.trim() && !meta.isContentOnly) {
      toast.error("Title is required");
      return;
    }
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
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{question ? "Edit question" : "Add question"}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as SurveyQuestionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {QUESTION_TYPE_LIST.map((t) => (
                  <SelectItem key={t} value={t}>{QUESTION_TYPE_META[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{meta.isContentOnly ? "Content" : "Question title"}</Label>
            <Textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Description / help text</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          {meta.hasChoices && (
            <div className="space-y-1.5">
              <Label>Options</Label>
              <ChoicesEditor choices={choices} onChange={setChoices} showCorrectAnswer />
            </div>
          )}
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
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isBusy}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
