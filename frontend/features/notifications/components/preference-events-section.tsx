"use client";

import { useCallback } from "react";
import { BellOff } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useNotificationPreferenceEventCatalog,
  useUpdateNotificationPreferenceEvent,
} from "@/hooks/api/notifications-preferences";
import type { PreferenceEventCatalogItem } from "@/types/notifications";

interface EventRowProps {
  item: PreferenceEventCatalogItem;
  isPending: boolean;
  onToggleMute: (eventKey: string, muted: boolean) => void;
}

function EventRow({ item, isPending, onToggleMute }: EventRowProps) {
  const pref = item.userPreference as { muted?: boolean } | null;
  const isMuted = pref?.muted === true;

  const handleChange = useCallback(
    (checked: boolean) => {
      onToggleMute(item.eventKey, !checked);
    },
    [item.eventKey, onToggleMute],
  );

  return (
    <div className="flex items-start justify-between px-3 py-2.5 bg-card gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{item.displayName}</p>
          {item.mandatory && (
            <Badge variant="outline" className="text-micro h-4 px-1.5">
              Required
            </Badge>
          )}
          {item.sourceModule && (
            <Badge variant="secondary" className="text-micro h-4 px-1.5">
              {item.sourceModule}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
      </div>
      {item.mandatory ? (
        <BellOff className="h-4 w-4 shrink-0 text-muted-foreground/40 mt-0.5" aria-label="Cannot mute this notification" />
      ) : (
        <Switch
          checked={!isMuted}
          onCheckedChange={handleChange}
          disabled={isPending || !item.userConfigurable}
          className="shrink-0"
          aria-label={`Toggle ${item.displayName}`}
        />
      )}
    </div>
  );
}

export function PreferenceEventsSection() {
  const { data: catalog, isLoading } = useNotificationPreferenceEventCatalog();
  const updateEvent = useUpdateNotificationPreferenceEvent();

  const handleToggleMute = useCallback(
    (eventKey: string, muted: boolean) => {
      updateEvent.mutate(
        { eventKey, muted },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [updateEvent],
  );

  const configurableEvents = catalog?.filter((e) => e.userConfigurable) ?? [];

  const byCategory = configurableEvents.reduce<Record<string, PreferenceEventCatalogItem[]>>(
    (acc, item) => {
      const key = item.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {},
  );

  if (isLoading) {
    return (
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Event Notifications
        </h2>
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-card gap-3">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (configurableEvents.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Event Notifications
      </h2>
      <div className="flex flex-col gap-3">
        {Object.entries(byCategory).map(([category, events]) => (
          <div key={category} className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            <div className="px-3 py-2 bg-muted/40 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {category.toLowerCase().replace(/_/g, " ")}
              </p>
            </div>
            {events.map((item) => (
              <EventRow
                key={item.eventKey}
                item={item}
                isPending={updateEvent.isPending}
                onToggleMute={handleToggleMute}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
