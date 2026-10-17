"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";

interface WebhookEmptyStateProps {
  isOnline: boolean;
  hasActiveFilters: boolean;
  onCreateWebhook?: () => void;
}

export function WebhookEmptyState({
  isOnline,
  hasActiveFilters,
  onCreateWebhook,
}: WebhookEmptyStateProps) {
  if (!isOnline) {
    return (
      <EmptyState
        className={CONTENT_FILL_PANEL}
        illustrationPreset="automations"
        title="You are offline"
        description="Webhooks cannot be configured while offline."
      />
    );
  }
  if (hasActiveFilters) {
    return (
      <EmptyState
        className={CONTENT_FILL_PANEL}
        illustrationPreset="automations"
        title="No webhooks match"
        description="Try adjusting the filters above."
      />
    );
  }
  return (
    <EmptyState
      className={CONTENT_FILL_PANEL}
      illustrationPreset="automations"
      title="No webhooks configured"
      description="Get notified in real-time when tickets, sprints, or members change."
      action={onCreateWebhook ? { label: "Create Webhook", onClick: onCreateWebhook } : undefined}
    />
  );
}
