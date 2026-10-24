"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { LANGUAGES } from "@/features/settings/organization/org-localization-schema";
import { SURVEY_MODE_META } from "@/features/surveys/shared/survey-mode-meta";
import { usePatchSurvey, type SurveyForm } from "@/hooks/api/surveys/forms";
import { AssessmentScoringCard } from "./assessment-scoring-card";
import { CollectorsCard } from "./collectors-card";
import { optionsSchema, type OptionsValues } from "./options-schema";

function PrivacyCopy() {
  return (
    <p className="text-sm text-muted-foreground">
      A response is identified when someone uses a participant link or email, and anonymous otherwise. One-per-email and expiry are set on each collector.
    </p>
  );
}

function PrivacyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Privacy</CardTitle>
      </CardHeader>
      <CardContent>
        <PrivacyCopy />
      </CardContent>
    </Card>
  );
}

function languageChoices(current: string) {
  if (LANGUAGES.some((language) => language.value === current)) return LANGUAGES;
  return [{ value: current, label: current.toUpperCase() }, ...LANGUAGES];
}

export function OptionsTab({ survey }: { survey: SurveyForm }) {
  const patchSurvey = usePatchSurvey(survey.id);
  const mode = SURVEY_MODE_META[survey.mode];
  const form = useForm<OptionsValues>({
    resolver: zodResolver(optionsSchema),
    defaultValues: {
      title: survey.title,
      description: survey.description ?? "",
      defaultLanguage: survey.defaultLanguage,
    },
  });

  async function onSubmit(values: OptionsValues) {
    try {
      await patchSurvey.mutateAsync(values);
      toast.success("Options saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col gap-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-w-0 flex-1 flex-col">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-sm">Survey</CardTitle>
              <CardDescription>Title, description, and the language respondents see first.</CardDescription>
              <CardAction>
                <LoadingButton type="submit" isPending={patchSurvey.isPending}>
                  Save
                </LoadingButton>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Title <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Default language <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {languageChoices(field.value).map((language) => (
                              <SelectItem key={language.value} value={language.value}>
                                {language.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex-1 grid-rows-[auto_minmax(8rem,1fr)_auto]">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="What this survey is for"
                          className="field-sizing-fixed h-full min-h-32 resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>
        </form>
      </Form>

      <div className="grid gap-4 lg:grid-cols-2">
        {survey.mode === "assessment" ? (
          <AssessmentScoringCard survey={survey} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Time & scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <mode.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">{mode.label}</p>
                  <p className="text-sm text-muted-foreground">{mode.description}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Scores are set on each question. Pass marks, attempt limits, and certificates are part of an assessment, and this survey was created as a {mode.label.toLowerCase()}.
              </p>
            </CardContent>
          </Card>
        )}
        <PrivacyCard />
      </div>

      <CollectorsCard surveyId={survey.id} />
    </div>
  );
}
