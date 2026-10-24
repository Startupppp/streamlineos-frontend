"use client";

import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePatchSurvey, type SurveyForm } from "@/hooks/api/surveys/forms";
import { messagesSchema, type MessagesValues } from "./messages-schema";

function MessageField({
  control,
  name,
  label,
  hint,
}: {
  control: Control<MessagesValues>;
  name: keyof MessagesValues;
  label: string;
  hint: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="rounded-lg border border-border/70 bg-muted/20 p-3">
          <FormLabel>{label}</FormLabel>
          <FormDescription>{hint}</FormDescription>
          <FormControl>
            <Textarea
              {...field}
              rows={3}
              className="field-sizing-fixed min-h-0 resize-y bg-card"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function MessagesTab({ survey }: { survey: SurveyForm }) {
  const patchSurvey = usePatchSurvey(survey.id);
  const existing = (survey.settings.messages as MessagesValues | undefined) ?? {};

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
      await patchSurvey.mutateAsync({
        settings: { ...survey.settings, messages: values },
      });
      toast.success("Messages saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-w-0 flex-1 flex-col"
        >
          <Card>
            <CardHeader>
              <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-0.5">
                <CardTitle className="text-sm">Messages</CardTitle>
                <CardDescription>Welcome and thank-you text.</CardDescription>
              </div>
              <CardAction className="col-start-1 row-start-2 mt-2 w-full justify-self-stretch sm:col-start-2 sm:row-span-1 sm:row-start-1 sm:mt-0 sm:w-auto sm:justify-self-end">
                <LoadingButton
                  type="submit"
                  size="sm"
                  isPending={patchSurvey.isPending}
                  className="w-full sm:w-auto"
                >
                  Save
                </LoadingButton>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <MessageField
                control={form.control}
                name="welcomeMessage"
                label="Welcome"
                hint="Shown before they start."
              />
              <MessageField
                control={form.control}
                name="thankYouMessage"
                label="Thank you"
                hint="Shown after they submit."
              />
              <MessageField
                control={form.control}
                name="disqualificationMessage"
                label="Disqualified"
                hint="Shown when logic ends the survey early."
              />
              <MessageField
                control={form.control}
                name="closedMessage"
                label="Closed"
                hint="Shown when this survey is closed."
              />
              <FormField
                control={form.control}
                name="submitButtonText"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 sm:max-w-xs">
                    <FormLabel>Submit button</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
