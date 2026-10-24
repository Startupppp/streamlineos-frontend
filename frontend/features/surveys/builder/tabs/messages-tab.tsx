"use client";

import { useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePatchSurvey, type SurveyForm } from "@/hooks/api/surveys/forms";
import { messagesSchema, type MessagesValues } from "./messages-schema";

function MessageField({
  control,
  name,
  label,
  placeholder,
  fill = false,
}: {
  control: Control<MessagesValues>;
  name: keyof MessagesValues;
  label: string;
  placeholder: string;
  fill?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(fill && "lg:h-full lg:grid-rows-[auto_minmax(8rem,1fr)_auto]")}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              placeholder={placeholder}
              className={cn("field-sizing-fixed resize-none", fill ? "min-h-32 lg:h-full" : "min-h-24")}
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
      await patchSurvey.mutateAsync({ settings: { ...survey.settings, messages: values } });
      toast.success("Messages saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-w-0 flex-1 flex-col">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-sm">Messages</CardTitle>
              <CardDescription>Copy respondents see before they start and after they finish.</CardDescription>
              <CardAction className="max-sm:col-span-full max-sm:row-start-3 max-sm:mt-2 max-sm:w-full max-sm:justify-self-stretch">
                <LoadingButton
                  type="submit"
                  isPending={patchSurvey.isPending}
                  className="w-full sm:w-auto"
                >
                  Save
                </LoadingButton>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-1">
                <MessageField
                  control={form.control}
                  name="welcomeMessage"
                  label="Welcome message"
                  placeholder="Shown before they start"
                  fill
                />
                <MessageField
                  control={form.control}
                  name="thankYouMessage"
                  label="Thank-you message"
                  placeholder="Shown after they submit"
                  fill
                />
              </div>
              <FormField
                control={form.control}
                name="submitButtonText"
                render={({ field }) => (
                  <FormItem className="sm:max-w-xs">
                    <FormLabel>Submit button text</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <MessageField
                  control={form.control}
                  name="disqualificationMessage"
                  label="Disqualification message"
                  placeholder="Shown when logic ends the survey early"
                />
                <MessageField
                  control={form.control}
                  name="closedMessage"
                  label="Closed survey message"
                  placeholder="Shown when this survey is closed"
                />
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
