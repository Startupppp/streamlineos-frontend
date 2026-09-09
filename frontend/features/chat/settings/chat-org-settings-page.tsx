"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useChatOrgSettings } from "@/hooks/api/chat-org-settings";
import { ChatSettingsForm } from "./chat-settings-form";

function ChatSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((section) => (
        <Card key={section}>
          <CardHeader className="gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-9 w-full" />
            </div>
            {section === 1 ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChatOrgSettingsPage() {
  const canRead = useCan("chat:channels:read");
  const { data, isLoading, isError, error, refetch } = useChatOrgSettings();

  if (!canRead) return <NoPermissionState permission="chat:channels:read" />;
  if (isError)
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load chat settings"
        description={getErrorMessage(error)}
        onRetry={refetch}
      />
    );
  if (isLoading || !data) return <ChatSettingsSkeleton />;

  return <ChatSettingsForm settings={data} />;
}
