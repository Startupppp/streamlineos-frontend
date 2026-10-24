"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  QUESTION_TYPE_LIST,
  QUESTION_TYPE_META,
} from "@/features/surveys/shared/question-type-meta";
import { ChoicesEditor } from "./choices-editor";
import { QuestionTypeSettings } from "./question-type-settings";
import { LogicRulesSection } from "./logic-rules-section";
import {
  useCreateQuestion,
  usePatchQuestion,
  type SurveyBuilderViewQuestion,
  type SurveyBuilderViewSection,
  type SurveyBuilderLogicRule,
} from "@/hooks/api/surveys/builder";
import {
  questionEditorSchema,
  type QuestionEditorValues,
} from "./question-editor-schema";

interface QuestionEditorSheetProps {
  surveyId: number;
  sectionId: number | null;
  question: SurveyBuilderViewQuestion | null;
  sections: SurveyBuilderViewSection[];
  logicRules: SurveyBuilderLogicRule[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function questionEditorSessionKey(
  open: boolean,
  questionId: number | null,
  sectionId: number | null,
): string {
  return `${open ? "open" : "closed"}:${questionId ?? "new"}:${sectionId ?? "none"}`;
}

export function QuestionEditorSheet(props: QuestionEditorSheetProps) {
  const { open, question, sectionId } = props;
  return (
    <QuestionEditorSheetBody
      key={questionEditorSessionKey(open, question?.id ?? null, sectionId)}
      {...props}
    />
  );
}

function QuestionEditorSheetBody({
  surveyId,
  sectionId,
  question,
  sections,
  logicRules,
  open,
  onOpenChange,
}: QuestionEditorSheetProps) {
  const createQuestion = useCreateQuestion(surveyId);
  const patchQuestion = usePatchQuestion(surveyId);
  const form = useForm<QuestionEditorValues>({
    resolver: zodResolver(questionEditorSchema),
    defaultValues: {
      type: question?.type ?? "short_text",
      title: question?.title ?? "",
      description: question?.description ?? "",
      required: question?.required ?? false,
      variableName: question?.variableName ?? "",
      choices:
        question?.choices.map((choice) => ({
          choiceKey: choice.choiceKey,
          label: choice.label,
          value: choice.value ?? undefined,
          score: choice.score ?? undefined,
          isCorrect: choice.isCorrect,
        })) ?? [],
      settings: question?.settings ?? {},
    },
  });
  const type = form.watch("type");
  const meta = QUESTION_TYPE_META[type];
  const isBusy = createQuestion.isPending || patchQuestion.isPending;

  async function handleSave(values: QuestionEditorValues) {
    const input = {
      title: values.title,
      description: values.description || undefined,
      type: values.type,
      required: values.required,
      variableName: values.variableName || undefined,
      choices: meta.hasChoices ? values.choices : undefined,
      settings: values.settings,
    };
    try {
      if (question) {
        await patchQuestion.mutateAsync({
          questionId: question.id,
          input,
        });
      } else if (sectionId) {
        await createQuestion.mutateAsync({
          sectionId,
          ...input,
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b px-4 py-4">
          <SheetTitle>{question ? "Edit question" : "Add question"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSave)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <SheetBody className="space-y-4 px-4 py-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUESTION_TYPE_LIST.map((questionType) => (
                          <SelectItem key={questionType} value={questionType}>
                            {QUESTION_TYPE_META[questionType].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {meta.isContentOnly ? "Content" : "Question title"}
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description / help text</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {meta.hasChoices && type !== "matrix" ? (
                <FormField
                  control={form.control}
                  name="choices"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Options</FormLabel>
                      <FormControl>
                        <ChoicesEditor
                          choices={field.value}
                          onChange={field.onChange}
                          showCorrectAnswer
                          showScore
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              {meta.hasChoices && type === "matrix" ? (
                <FormField
                  control={form.control}
                  name="choices"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Columns</FormLabel>
                      <FormControl>
                        <ChoicesEditor
                          choices={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <FormField
                control={form.control}
                name="settings"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <QuestionTypeSettings
                        type={type}
                        settings={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!meta.isContentOnly ? (
                <>
                  <FormField
                    control={form.control}
                    name="variableName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Variable name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. first_name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="required"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel htmlFor="question-required">
                          Required
                        </FormLabel>
                        <FormControl>
                          <Switch
                            id="question-required"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}
              {question ? (
                <LogicRulesSection
                  surveyId={surveyId}
                  question={question}
                  sections={sections}
                  rules={logicRules}
                />
              ) : null}
            </SheetBody>
            <SheetFooter className="shrink-0 w-full flex-row gap-2 border-t px-4 py-3">
              <LoadingButton
                type="submit"
                isPending={isBusy}
                className="min-w-0 flex-1"
              >
                Save
              </LoadingButton>
              <Button
                type="button"
                variant="outline"
                className="min-w-0 flex-1"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
