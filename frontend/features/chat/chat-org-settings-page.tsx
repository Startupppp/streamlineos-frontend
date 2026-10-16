"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useChatOrgSettings, useUpdateChatOrgSettings } from "@/hooks/api/chat-org-settings";
import type { ChatOrgSettings } from "@/hooks/api/chat-schema/channel-settings-schema";
import { chatOrgSettingsFormSchema, type ChatOrgSettingsFormValues } from "./chat-org-settings-schema";
import { ChatOrgSettingsFormFields } from "./chat-org-settings-form-fields";

function toFormValues(s: ChatOrgSettings): ChatOrgSettingsFormValues {
  return {
    defaultNotificationPreference: s.defaultNotificationPreference,
    maxAttachmentSizeMb: String(s.maxAttachmentSizeMb),
    maxHuddleParticipants: String(s.maxHuddleParticipants),
  };
}

export function ChatOrgSettingsPage() {
  const { data, isLoading, isError, error, refetch } = useChatOrgSettings();
  const state = usePageState({ permission: "chat:org-settings:manage", isLoading, isError, error });
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper title="Chat Settings" subtitle="Organisation-wide defaults for channels, attachments and huddles.">
      <PageState
        resolution={state}
        onRetry={handleRetry}
        loading={
          <Card className="max-w-2xl">
            <CardContent className="space-y-6 pt-6">
              <Skeleton className="h-14 w-64" />
              <Skeleton className="h-14 w-40" />
              <Skeleton className="h-14 w-40" />
            </CardContent>
          </Card>
        }
      >
        {/* Keyed on the saved values so the form starts from them and resets after a save. */}
        {data ? <ChatOrgSettingsForm key={JSON.stringify(data)} settings={data} /> : null}
      </PageState>
    </PageWrapper>
  );
}

function ChatOrgSettingsForm({ settings }: { settings: ChatOrgSettings }) {
  const update = useUpdateChatOrgSettings();
  const form = useForm<ChatOrgSettingsFormValues>({
    resolver: zodResolver(chatOrgSettingsFormSchema),
    defaultValues: toFormValues(settings),
  });

  const handleSave = form.handleSubmit((values) => {
    update.mutate({
      defaultNotificationPreference: values.defaultNotificationPreference,
      maxAttachmentSizeMb: Number(values.maxAttachmentSizeMb),
      maxHuddleParticipants: Number(values.maxHuddleParticipants),
    });
  });

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={handleSave} className="space-y-6">
            <ChatOrgSettingsFormFields form={form} />
            <LoadingButton
              type="submit"
              isPending={update.isPending}
              loadingText="Saving…"
              disabled={!form.formState.isDirty}
            >
              Save changes
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
