"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { getApiError } from "@/lib/api-client";
import { usePatchSurvey, type SurveyForm } from "@/hooks/api/surveys/forms";

const messagesSchema = z.object({
  welcomeMessage: z.string().max(2000).optional(),
  submitButtonText: z.string().max(100).optional(),
  thankYouMessage: z.string().max(2000).optional(),
  disqualificationMessage: z.string().max(2000).optional(),
  closedMessage: z.string().max(2000).optional(),
});

type MessagesValues = z.infer<typeof messagesSchema>;

type SurveyMessages = MessagesValues;

export function MessagesTab({ survey }: { survey: SurveyForm }) {
  const patchSurvey = usePatchSurvey(survey.id);
  const existing = (survey.settings.messages as SurveyMessages | undefined) ?? {};

  const form = useForm<MessagesValues>({
    resolver: zodResolver(messagesSchema),
    defaultValues: {
      welcomeMessage: existing.welcomeMessage ?? "",
      submitButtonText: existing.submitButtonText ?? "Submit",
      thankYouMessage: existing.thankYouMessage ?? "Thank you for your response!",
      disqualificationMessage: existing.disqualificationMessage ?? "",
      closedMessage: existing.closedMessage ?? "This survey is no longer accepting responses.",
    },
  });

  async function onSubmit(values: MessagesValues) {
    try {
      await patchSurvey.mutateAsync({ settings: { ...survey.settings, messages: values } });
      toast.success("Messages saved");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="welcomeMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Welcome message</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Shown on the respondent's welcome screen" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="submitButtonText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Submit button text</FormLabel>
                  <FormControl>
                    <Input {...field} className="w-48" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="thankYouMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thank-you message</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="disqualificationMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disqualification message</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="Shown when logic disqualifies a respondent" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="closedMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Closed survey message</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
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
  );
}
