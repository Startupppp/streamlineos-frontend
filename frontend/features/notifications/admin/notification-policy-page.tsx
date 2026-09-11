"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useNotificationPolicies, useUpsertNotificationPolicy } from "@/hooks/api/notifications";
import { useCan } from "@/hooks/api/access";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-types";
import { getErrorMessage } from "@/lib/get-error-message";
import type { NotificationChannel, NotificationCategory, PolicyOverride } from "@/types/notifications";
import {
  buildInitialCategoryState,
  type CategoryState,
} from "./notification-policy-state";
import {
  CategoryOverridesCard,
  DefaultChannelsCard,
  UserOverridesCard,
} from "./notification-policy-sections";

export function NotificationPolicyPage() {
  const canManage = useCan("notifications:policy:manage");
  const { data: policies, isLoading, isError, refetch } = useNotificationPolicies();
  const upsert = useUpsertNotificationPolicy();

  const hydrated = useRef(false);

  const orgPolicy = policies?.find(
    (p) => p.scopeType === "ORG" && p.scopeId === null,
  ) ?? null;

  const [defaultChannels, setDefaultChannels] = useState<NotificationChannel[]>([]);
  const [canUserOverride, setCanUserOverride] = useState(true);
  const [categoryState, setCategoryState] = useState<Record<NotificationCategory, CategoryState>>(
    () => buildInitialCategoryState({}),
  );

  if (!hydrated.current && orgPolicy !== null && policies !== undefined) {
    hydrated.current = true;
    setDefaultChannels(orgPolicy.defaultChannels);
    setCanUserOverride(orgPolicy.canUserOverride);
    setCategoryState(buildInitialCategoryState(orgPolicy.categoryOverrides));
  }

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDefaultChannelToggle = useCallback(
    (channel: NotificationChannel, checked: boolean) => {
      setDefaultChannels((prev) =>
        checked ? [...prev, channel] : prev.filter((c) => c !== channel),
      );
    },
    [],
  );

  const handleUserOverrideToggle = useCallback((checked: boolean) => {
    setCanUserOverride(checked);
  }, []);

  const handleCategoryMuteToggle = useCallback(
    (cat: NotificationCategory, checked: boolean) => {
      setCategoryState((prev) => ({
        ...prev,
        [cat]: { ...prev[cat], muted: checked },
      }));
    },
    [],
  );

  const handleCategoryChannelToggle = useCallback(
    (cat: NotificationCategory, channel: NotificationChannel, checked: boolean) => {
      setCategoryState((prev) => ({
        ...prev,
        [cat]: {
          ...prev[cat],
          channels: checked
            ? [...prev[cat].channels, channel]
            : prev[cat].channels.filter((c) => c !== channel),
        },
      }));
    },
    [],
  );

  const handleSave = useCallback(() => {
    const categoryOverrides: Record<string, PolicyOverride> = {};
    for (const cat of NOTIFICATION_CATEGORIES) {
      const state = categoryState[cat];
      if (state.muted || state.channels.length > 0) {
        const override: PolicyOverride = {};
        if (state.muted) override.muted = true;
        if (state.channels.length > 0) override.channels = state.channels;
        categoryOverrides[cat] = override;
      }
    }

    upsert.mutate(
      {
        scopeType: "ORG",
        scopeId: null,
        defaultChannels,
        canUserOverride,
        categoryOverrides,
      },
      {
        onSuccess: () => toast.success("Policy saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [upsert, defaultChannels, canUserOverride, categoryState]);

  if (isLoading) {
    return (
      <PageWrapper
        title="Notification Policy"
        subtitle="Configure organization-wide notification delivery defaults"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-56" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Notification Policy"
        subtitle="Configure organization-wide notification delivery defaults"
      >
        <ErrorState
          title="Failed to load policy"
          description="Could not load the notification policy. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Notification Policy"
      subtitle="Configure organization-wide notification delivery defaults"
      actions={
        canManage ? (
          <LoadingButton size="sm" onClick={handleSave} isPending={upsert.isPending} loadingText="Saving...">
            Save changes
          </LoadingButton>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <DefaultChannelsCard
          defaultChannels={defaultChannels}
          canManage={canManage}
          onToggle={handleDefaultChannelToggle}
        />
        <UserOverridesCard
          canUserOverride={canUserOverride}
          canManage={canManage}
          onToggle={handleUserOverrideToggle}
        />
        <CategoryOverridesCard
          categoryState={categoryState}
          canManage={canManage}
          onMuteToggle={handleCategoryMuteToggle}
          onChannelToggle={handleCategoryChannelToggle}
        />
      </div>
    </PageWrapper>
  );
}
