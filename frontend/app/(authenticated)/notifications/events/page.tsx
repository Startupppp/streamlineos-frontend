"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Settings2, Bell } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL, FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { ErrorState } from "@/components/shared/error-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { SendIcon } from "@animateicons/react/lucide";
import {
  useNotificationEventCatalog,
  useUpdateNotificationEventPolicy,
  useEmitNotificationEvent,
} from "@/hooks/api/notifications";
import { useCan } from "@/hooks/api/access";
import { policySchema, type PolicyFormValues } from "@/features/notifications/policy-schema";
import type {
  NotificationEventDefinition,
  NotificationChannel,
  NotificationPriority,
} from "@/types/notifications";

import { EventRow } from "@/features/notifications/components/event-row";
import { PolicySheet } from "@/features/notifications/components/event-policy-sheet";

export default function NotificationEventsPage() {
  const canManage = useCan("notifications:events:manage");
  const { data: events, isLoading, isError, refetch } = useNotificationEventCatalog();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const emitEvent = useEmitNotificationEvent();
  const shouldReduceMotion = useReducedMotion();

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [configTarget, setConfigTarget] = useState<NotificationEventDefinition | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sendingKey, setSendingKey] = useState<string | null>(null);

  const handleSendTest = useCallback(
    (event: NotificationEventDefinition) => {
      if (!currentUserId) {
        toast.error("Could not determine your account to send a test");
        return;
      }
      setSendingKey(event.eventKey);
      emitEvent.mutate(
        { eventKey: event.eventKey, targetUserIds: [currentUserId] },
        {
          onSuccess: (result) => {
            const parts = [`${result.notified} in-app`, `${result.deliveriesQueued} queued`];
            if (result.suppressed > 0) parts.push(`${result.suppressed} suppressed`);
            if (result.deduped > 0) parts.push(`${result.deduped} deduped`);
            toast.success(`Test event sent — ${parts.join(", ")}`);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
          onSettled: () => setSendingKey(null),
        },
      );
    },
    [currentUserId, emitEvent],
  );

  const sourceModules = useMemo(() => {
    if (!events) return [];
    return Array.from(new Set(events.map((e) => e.sourceModule))).sort();
  }, [events]);

  const filtered = useMemo(() => {
    if (!events) return [];
    const q = search.toLowerCase();
    return events.filter((e) => {
      const matchesSearch =
        !q ||
        e.displayName.toLowerCase().includes(q) ||
        e.eventKey.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q);
      const matchesModule = moduleFilter === "all" || e.sourceModule === moduleFilter;
      return matchesSearch && matchesModule;
    });
  }, [events, search, moduleFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationEventDefinition[]>();
    for (const e of filtered) {
      const list = map.get(e.sourceModule) ?? [];
      list.push(e);
      map.set(e.sourceModule, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleConfigure = useCallback((event: NotificationEventDefinition) => {
    setConfigTarget(event);
    setSheetOpen(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
    setConfigTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleModuleChange = useCallback((value: string) => {
    setModuleFilter(value);
  }, []);

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search events…"
        value={search}
        onValueChange={handleSearchChange} className="min-w-0 flex-1"
      />
      <Select value={moduleFilter} onValueChange={handleModuleChange}>
        <SelectTrigger className={`w-44 ${FILTER_SELECT_TRIGGER}`}>
          <SelectValue placeholder="All modules" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All modules</SelectItem>
          {sourceModules.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      title="Event Catalog"
      subtitle="View and configure per-event notification policy for your organization"
      filters={filters}
    >
      {isLoading ? (
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border flex-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load event catalog"
          description="Could not load the notification event catalog."
          onRetry={handleRetry}
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          illustrationPreset="activity"
          title="No events found"
          description={
            search || moduleFilter !== "all"
              ? "No events match your current filters. Try adjusting your search or module selection."
              : "No notification events are registered for this organization."
          }
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {grouped.map(([module, moduleEvents], groupIdx) => (
            <motion.div
              key={module}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(groupIdx, 10) * 0.04, ease: "easeOut" }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Bell className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {module}
                </span>
                <span className="text-micro text-muted-foreground/50 tabular-nums">
                  {moduleEvents.length}
                </span>
              </div>
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                {moduleEvents.map((event) => (
                  <EventRow
                    key={event.eventKey}
                    event={event}
                    canManage={canManage}
                    onConfigure={handleConfigure}
                    onSendTest={handleSendTest}
                    sending={sendingKey === event.eventKey}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <PolicySheet
        open={sheetOpen}
        event={configTarget}
        onClose={handleSheetClose}
        canManage={canManage}
      />
    </PageWrapper>
  );
}
