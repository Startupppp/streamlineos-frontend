"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePatchSurvey, type SurveyForm } from "@/hooks/api/surveys/forms";
import {
  assessmentScoringSchema,
  type AssessmentScoringValues,
} from "./assessment-scoring-schema";

interface AssessmentSettings {
  passScore?: number;
  attemptsAllowed?: number;
  timeLimitMinutes?: number;
  certificateOnPass?: boolean;
}

export function AssessmentScoringCard({
  survey,
  className,
}: {
  survey: SurveyForm;
  className?: string;
}) {
  const patchSurvey = usePatchSurvey(survey.id);
  const existing = (survey.settings as AssessmentSettings | undefined) ?? {};
  const form = useForm<AssessmentScoringValues>({
    resolver: zodResolver(assessmentScoringSchema),
    defaultValues: {
      passScore: existing.passScore ?? 0,
      attemptsAllowed: existing.attemptsAllowed ?? 0,
      timeLimitMinutes: existing.timeLimitMinutes ?? 0,
      certificateOnPass: existing.certificateOnPass ?? false,
    },
  });

  async function handleSave(values: AssessmentScoringValues) {
    try {
      await patchSurvey.mutateAsync({
        settings: {
          ...survey.settings,
          passScore: values.passScore,
          attemptsAllowed: values.attemptsAllowed || undefined,
          timeLimitMinutes: values.timeLimitMinutes || undefined,
          certificateOnPass: values.certificateOnPass,
        },
      });
      toast.success("Assessment settings saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="text-sm">Time & scoring</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSave)}
            className="space-y-4"
          >
            <div className="flex flex-wrap gap-3">
              <FormField
                control={form.control}
                name="passScore"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Pass score</FormLabel>
                    <FormControl>
                      <Input type="number" className="w-28" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attemptsAllowed"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Attempts allowed</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        className="w-28"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeLimitMinutes"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Time limit (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="None"
                        className="w-28"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="certificateOnPass"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel htmlFor="certificate-on-pass">
                    Issue certificate on pass
                  </FormLabel>
                  <FormControl>
                    <Switch
                      id="certificate-on-pass"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
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
  );
}
