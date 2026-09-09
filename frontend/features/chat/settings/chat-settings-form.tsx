"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useUpdateChatOrgSettings, type ChatOrgSettings } from "@/hooks/api/chat-org-settings";
import {
  CHAT_NOTIFICATION_PREFERENCES,
  chatOrgSettingsFormSchema,
  type ChatOrgSettingsFormInput,
} from "./chat-settings-schema";

interface ChatSettingsFormProps {
  settings: ChatOrgSettings;
}

export function ChatSettingsForm({ settings }: ChatSettingsFormProps) {
  const canManage = useCan("chat:org-settings:manage");
  const updateSettings = useUpdateChatOrgSettings();

  const form = useForm<ChatOrgSettingsFormInput>({
    resolver: zodResolver(chatOrgSettingsFormSchema),
    defaultValues: {
      defaultNotificationPreference: settings.defaultNotificationPreference,
      maxAttachmentSizeMb: settings.maxAttachmentSizeMb,
      maxHuddleParticipants: settings.maxHuddleParticipants,
    },
  });

  const handleSubmit = (values: ChatOrgSettingsFormInput) => {
    updateSettings.mutate(values, {
      onSuccess: (saved) => {
        toast.success("Chat settings saved");
        form.reset({
          defaultNotificationPreference: saved.defaultNotificationPreference,
          maxAttachmentSizeMb: saved.maxAttachmentSizeMb,
          maxHuddleParticipants: saved.maxHuddleParticipants,
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };

  const handleReset = () => {
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
            <CardDescription>
              What a new member is notified about before they change their own preference.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="defaultNotificationPreference"
              render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormLabel>Default notification preference</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!canManage}
                  >
                    <FormControl>
                      <SelectTrigger aria-label="Default notification preference">
                        <SelectValue placeholder="Select a preference" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                      {CHAT_NOTIFICATION_PREFERENCES.map((preference) => (
                        <SelectItem key={preference.value} value={preference.value}>
                          {preference.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Members who have already chosen their own setting keep it.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Limits</CardTitle>
            <CardDescription>
              Ceilings applied to every channel in this organisation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="maxAttachmentSizeMb"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum attachment size</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={1000}
                      step={1}
                      className="tabular-nums"
                      disabled={!canManage}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={Number.isNaN(field.value) ? "" : String(field.value)}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormDescription>Megabytes per file, between 1 and 1000.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxHuddleParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum huddle participants</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={2}
                      max={500}
                      step={1}
                      className="tabular-nums"
                      disabled={!canManage}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={Number.isNaN(field.value) ? "" : String(field.value)}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormDescription>
                    Your plan may impose a lower ceiling; the smaller of the two applies.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {canManage ? (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!form.formState.isDirty || updateSettings.isPending}
            >
              Discard changes
            </Button>
            <LoadingButton
              type="submit"
              size="sm"
              isPending={updateSettings.isPending}
              loadingText="Saving…"
              disabled={!form.formState.isDirty}
            >
              Save settings
            </LoadingButton>
          </div>
        ) : null}
      </form>
    </Form>
  );
}
