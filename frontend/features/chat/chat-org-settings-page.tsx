"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { usePageState } from "@/hooks/api/use-page-state";
import { useChatOrgSettings, useUpdateChatOrgSettings } from "@/hooks/api/chat-org-settings";
import type { ChatOrgSettings } from "@/hooks/api/chat-schema/channel-settings-schema";
import { CHAT_ORG_SETTINGS_LAYOUT } from "@/lib/renderer/chat/chat-org-settings-layout";

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
  const layout = useTenantLayout(CHAT_ORG_SETTINGS_LAYOUT);
  const update = useUpdateChatOrgSettings();

  function handleSave(values: RecordFormValues) {
    update.mutate({
      defaultNotificationPreference:
        values.defaultNotificationPreference as ChatOrgSettings["defaultNotificationPreference"],
      maxAttachmentSizeMb: Number(values.maxAttachmentSizeMb),
      maxHuddleParticipants: Number(values.maxHuddleParticipants),
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <RecordForm
          layout={layout}
          mode="edit"
          initial={settings}
          onSubmit={handleSave}
          isSubmitting={update.isPending}
          submitLabel="Save changes"
        />
      </CardContent>
    </Card>
  );
}
