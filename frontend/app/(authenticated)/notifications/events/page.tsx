"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Settings2, Bell } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
import type {
  NotificationEventDefinition,
  NotificationChannel,
  NotificationPriority,
} from "@/types/notifications";

const CHANNELS: Array<{ value: NotificationChannel; label: string }> = [
  { value: "IN_APP", label: "In-App" },
  { value: "EMAIL", label: "Email" },
  { value: "PUSH", label: "Push" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SLACK", label: "Slack" },
  { value: "TEAMS", label: "Teams" },
  { value: "WEBHOOK", label: "Webhook" },
];

const PRIORITIES: Array<{ value: NotificationPriority; label: string }> = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const QUIET_HOURS_OPTIONS = [
  { value: "respect", label: "Respect quiet hours" },
  { value: "bypass_if_high", label: "Bypass if HIGH or CRITICAL" },
  { value: "always_bypass", label: "Always bypass quiet hours" },
] as const;

const priorityBadgeClass: Record<NotificationPriority, string> = {
  CRITICAL: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  NORMAL: "bg-muted text-muted-foreground border-border",
  LOW: "bg-muted text-muted-foreground border-border",
};

const policySchema = z.object({
  enabled: z.boolean(),
  defaultPriority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  defaultChannels: z.array(z.enum(["IN_APP", "EMAIL", "PUSH", "SMS", "WHATSAPP", "SLACK", "TEAMS", "WEBHOOK"])),
  quietHoursBehavior: z.enum(["respect", "bypass_if_high", "always_bypass"]),
  dedupeWindowSeconds: z.string(),
  rateLimitWindowSeconds: z.string(),
  rateLimitMax: z.string(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

function PolicySheet({
  open,
  event,
  onClose,
  canManage,
}: {
  open: boolean;
  event: NotificationEventDefinition | null;
  onClose: () => void;
  canManage: boolean;
}) {
  const updatePolicy = useUpdateNotificationEventPolicy();

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      enabled: event?.enabled ?? true,
      defaultPriority: event?.defaultPriority ?? "NORMAL",
      defaultChannels: event?.defaultChannels ?? [],
      quietHoursBehavior: event?.quietHoursBehavior ?? "respect",
      dedupeWindowSeconds: String(event?.dedupeWindowSeconds ?? 0),
      rateLimitWindowSeconds: String(event?.rateLimitWindowSeconds ?? 0),
      rateLimitMax: String(event?.rateLimitMax ?? 0),
    },
    values: event
      ? {
          enabled: event.enabled,
          defaultPriority: event.defaultPriority,
          defaultChannels: event.defaultChannels,
          quietHoursBehavior: event.quietHoursBehavior,
          dedupeWindowSeconds: String(event.dedupeWindowSeconds),
          rateLimitWindowSeconds: String(event.rateLimitWindowSeconds),
          rateLimitMax: String(event.rateLimitMax),
        }
      : undefined,
  });

  const handleSubmit = useCallback(
    (values: PolicyFormValues) => {
      if (!event) return;
      updatePolicy.mutate(
        {
          eventKey: event.eventKey,
          enabled: values.enabled,
          defaultPriority: values.defaultPriority,
          defaultChannels: values.defaultChannels,
          quietHoursBehavior: values.quietHoursBehavior,
          dedupeWindowSeconds: Number(values.dedupeWindowSeconds),
          rateLimitWindowSeconds: Number(values.rateLimitWindowSeconds),
          rateLimitMax: Number(values.rateLimitMax),
        },
        {
          onSuccess: () => {
            toast.success("Event policy updated");
            onClose();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [event, updatePolicy, onClose],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  if (!event) return null;

  const allowedChannelSet = new Set(event.allowedChannels);
  const isMandatory = event.mandatory;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Configure Event</SheetTitle>
          <p className="text-xs font-mono text-muted-foreground">{event.eventKey}</p>
        </SheetHeader>
        <SheetBody className="px-6 py-4">
          <Form {...form}>
            <form id="policy-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3 gap-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Enabled</FormLabel>
                      {isMandatory && (
                        <p className="text-[11px] text-muted-foreground">Mandatory events cannot be disabled</p>
                      )}
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isMandatory || !canManage}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultPriority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!canManage}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultChannels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Channels</FormLabel>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {CHANNELS.filter((c) => allowedChannelSet.has(c.value)).map((c) => {
                        const checked = field.value.includes(c.value);
                        const handleChange = (checked: boolean) => {
                          field.onChange(
                            checked
                              ? [...field.value, c.value]
                              : field.value.filter((v) => v !== c.value),
                          );
                        };
                        return (
                          <label
                            key={c.value}
                            className={cn(
                              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                              checked ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                              !canManage && "pointer-events-none opacity-60",
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={handleChange}
                              disabled={!canManage}
                            />
                            {c.label}
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Only channels allowed for this event are shown.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quietHoursBehavior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quiet Hours Behavior</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!canManage}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {QUIET_HOURS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="dedupeWindowSeconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dedupe Window (s)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} disabled={!canManage} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rateLimitMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Limit Max</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} disabled={!canManage} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="rateLimitWindowSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Limit Window (s)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter className="px-6 py-4 border-t justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={updatePolicy.isPending}>
            Cancel
          </Button>
          {canManage && (
            <LoadingButton
              type="submit"
              form="policy-form"
              isPending={updatePolicy.isPending}
              loadingText="Saving..."
            >
              Save Changes
            </LoadingButton>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function EventRow({
  event,
  canManage,
  onConfigure,
  onSendTest,
  sending,
}: {
  event: NotificationEventDefinition;
  canManage: boolean;
  onConfigure: (event: NotificationEventDefinition) => void;
  onSendTest: (event: NotificationEventDefinition) => void;
  sending: boolean;
}) {
  const updatePolicy = useUpdateNotificationEventPolicy();
  const sendAnim = useAnimatedIcon();

  const handleEnabledChange = useCallback(
    (checked: boolean) => {
      updatePolicy.mutate(
        { eventKey: event.eventKey, enabled: checked },
        {
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [event.eventKey, updatePolicy],
  );

  const handleConfigureClick = useCallback(() => {
    onConfigure(event);
  }, [event, onConfigure]);

  const handleSendTestClick = useCallback(() => {
    onSendTest(event);
  }, [event, onSendTest]);

  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{event.displayName}</span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
            {event.category}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-[10px] h-4 px-1.5 shrink-0 border", priorityBadgeClass[event.defaultPriority])}
          >
            {event.defaultPriority}
          </Badge>
          {event.mandatory && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 border-orange-200 text-orange-700 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30">
              Mandatory
            </Badge>
          )}
          {event.overridden && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 border-primary/20 text-foreground bg-primary/10">
              Overridden
            </Badge>
          )}
          <div className="flex items-center gap-1 flex-wrap">
            {event.defaultChannels.map((ch) => (
              <span
                key={ch}
                className="inline-flex items-center text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-medium"
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
        <p className="text-[11px] font-mono text-muted-foreground/60">{event.eventKey}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Switch
          checked={event.enabled}
          onCheckedChange={handleEnabledChange}
          disabled={event.mandatory || !canManage || updatePolicy.isPending}
          aria-label={`Toggle ${event.displayName}`}
        />
        {canManage && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleSendTestClick}
              disabled={sending}
              title="Send test to me"
              {...sendAnim.hoverHandlers}
            >
              <SendIcon
                ref={sendAnim.iconRef}
                size={14}
                className={cn("text-muted-foreground", sending && "animate-pulse")}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleConfigureClick}
              title="Configure"
            >
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleModuleChange = useCallback((value: string) => {
    setModuleFilter(value);
  }, []);

  const filters = (
    <>
      <Input
        placeholder="Search events…"
        value={search}
        onChange={handleSearchChange}
        className="h-8 w-56 text-xs"
      />
      <Select value={moduleFilter} onValueChange={handleModuleChange}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="All modules" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All modules</SelectItem>
          {sourceModules.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <PageWrapper
      title="Event Catalog"
      subtitle="View and configure per-event notification policy for your organization"
      filters={filters}
      filtersCollapseBreakpoint="md"
      mobileFiltersInline
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
        />
      ) : (
        <div className="space-y-4 flex flex-1 min-h-0 flex-col">
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
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
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
