"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePatchSurvey, type SurveyForm } from "@/hooks/api/surveys/forms";
import { AssessmentScoringCard } from "./assessment-scoring-card";
import { CollectorsCard } from "./collectors-card";
import { optionsSchema, type OptionsValues } from "./options-schema";

export function OptionsTab({ survey }: { survey: SurveyForm }) {
  const patchSurvey = usePatchSurvey(survey.id);
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
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
                    <FormControl>
                      <Input {...field} className="w-24" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <LoadingButton type="submit" size="sm" isPending={patchSurvey.isPending}>
                Save
              </LoadingButton>
            </form>
          </Form>
        </CardContent>
      </Card>

      {survey.mode === "assessment" ? (
        <AssessmentScoringCard survey={survey} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Time & Scoring</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Per-question scoring is set on each question&apos;s options. Switch this survey to Assessment mode for pass
              score, attempts, and certificates.
            </p>
          </CardContent>
        </Card>
      )}

      <CollectorsCard surveyId={survey.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Anonymity is inferred per response: identified when a participant access link or email is used, anonymous
            otherwise. Access rules (one-per-email, expiry) are set per collector above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
