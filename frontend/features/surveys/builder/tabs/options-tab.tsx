"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { getApiError } from "@/lib/api-client";
import { usePatchSurvey, type SurveyForm } from "@/hooks/api/surveys/forms";
import { AssessmentScoringCard } from "./assessment-scoring-card";

const optionsSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  defaultLanguage: z.string().min(2).max(10),
});

type OptionsValues = z.infer<typeof optionsSchema>;

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
      toast.error(getApiError(error));
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
                    <FormLabel>Title</FormLabel>
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
                    <FormLabel>Default language</FormLabel>
                    <FormControl>
                      <Input {...field} className="w-24" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="sm" disabled={patchSurvey.isPending}>
                Save
              </Button>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Anonymity and access rules are managed from the Participants tab collectors.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
