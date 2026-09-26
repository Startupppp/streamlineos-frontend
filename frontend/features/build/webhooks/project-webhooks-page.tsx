"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useUpdateWebhook,
  type ProjectWebhook,
} from "@/hooks/api/build/webhooks";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { LoadingButton } from "@/components/ui/loading-button";
import { WebhookCard } from "@/features/build/settings/webhook-card";
import {
  webhookSchema,
  type WebhookFormValues,
} from "@/features/build/webhooks/webhook-schema";
import { setListMembership } from "@/lib/toggle-in-list";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import { useOnlineStatus } from "@/hooks/common/use-online-status";

function subscribeToEvent(
  onChange: (events: string[]) => void,
  subscribed: string[],
  event: string,
): (checked: boolean | "indeterminate") => void {
  return function handleEventSubscriptionToggle(checked) {
    onChange(setListMembership(subscribed, event, checked !== false));
  };
}

const WEBHOOK_EVENTS = [
  { value: "ticket.created", label: "Ticket Created" },
  { value: "ticket.updated", label: "Ticket Updated" },
  { value: "ticket.deleted", label: "Ticket Deleted" },
  { value: "ticket.assigned", label: "Ticket Assigned" },
  { value: "sprint.started", label: "Sprint Started" },
  { value: "sprint.completed", label: "Sprint Completed" },
  { value: "comment.created", label: "Comment Added" },
  { value: "member.added", label: "Member Added" },
  { value: "member.removed", label: "Member Removed" },
];

function AddWebhookButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" />
      Add Webhook
    </Button>
  );
}

interface ProjectWebhooksPageProps {
  projectId: string;
}

export function ProjectWebhooksPage({
  projectId: projectIdStr,
}: ProjectWebhooksPageProps) {
  const projectId = parseInt(projectIdStr);
  const canManage = useCan("build:manage");
  const isOnline = useOnlineStatus();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const stateParam = searchParams.get("state") as "active" | "inactive" | null;
  const eventParam = searchParams.get("event") ?? undefined;
  const qParam = searchParams.get("q") ?? undefined;

  const [qInput, setQInput] = useState(qParam ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const filters =
    stateParam || eventParam || qParam
      ? { state: stateParam ?? undefined, event: eventParam, q: qParam }
      : undefined;

  const updateUrl = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete("cursor");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleStateChange = useCallback(
    (value: string) => {
      updateUrl({ state: value === "all" ? undefined : value });
    },
    [updateUrl],
  );

  const handleEventChange = useCallback(
    (value: string) => {
      updateUrl({ event: value === "all" ? undefined : value });
    },
    [updateUrl],
  );

  const handleQChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateUrl({ q: value || undefined });
      }, 300);
    },
    [updateUrl],
  );

  const {
    data: webhooks,
    isLoading,
    isError,
    error,
    refetch,
  } = useWebhooks(projectId, filters);

  const pageState = usePageState({
    permission: "build:manage",
    isLoading,
    isError,
    error,
    isEmpty: webhooks !== undefined && webhooks.length === 0,
  });

  const createWebhook = useCreateWebhook(projectId);
  const deleteWebhook = useDeleteWebhook(projectId);
  const updateWebhook = useUpdateWebhook(projectId);

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: "", events: [], secret: "" },
  });
  useRegisterDirtyState(sheetOpen && form.formState.isDirty);

  const handleSubmit = useCallback(
    (values: WebhookFormValues) => {
      createWebhook.mutate(
        {
          url: values.url,
          events: values.events,
          secret: values.secret || undefined,
        },
        {
          onSuccess: () => {
            form.reset();
            setSheetOpen(false);
            toast.success("Webhook created");
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [createWebhook, form],
  );

  const handleDelete = useCallback(
    (webhookId: number) => {
      deleteWebhook.mutate(webhookId, {
        onSuccess: () => toast.success("Webhook deleted"),
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [deleteWebhook],
  );

  const handleToggle = useCallback(
    (webhookId: number, isActive: boolean) => {
      updateWebhook.mutate(
        { webhookId, isActive },
        {
          onSuccess: () =>
            toast.success(isActive ? "Webhook enabled" : "Webhook disabled"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateWebhook],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleCancelForm = useCallback(() => {
    setSheetOpen(false);
    form.reset();
  }, [form]);

  const handleShowForm = useCallback(() => setSheetOpen(true), []);
  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  const webhookList = webhooks ?? [];
  const handleOpenWebhook = useCallback((_index: number) => {}, []);
  const handleClearWebhookSelection = useCallback(() => {}, []);
  useBuildListKeyboard({
    itemCount: webhookList.length,
    onOpen: handleOpenWebhook,
    onCreate: canManage && isOnline ? handleShowForm : undefined,
    onClearSelection: handleClearWebhookSelection,
    onShortcutHelp: handleShortcutHelp,
    enabled: pageState.kind === "ready",
  });

  const hasActiveFilters = !!(stateParam || eventParam || qParam);

  return (
    <PageWrapper
      title="Webhooks"
      subtitle="Receive HTTP POST notifications when project events occur"
      actions={
        canManage && isOnline ? <AddWebhookButton onClick={handleShowForm} /> : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Input
              placeholder="Search by URL…"
              value={qInput}
              onChange={handleQChange}
              className="h-8 text-sm w-48 shrink-0"
              aria-label="Search webhooks"
            />
            <Select value={stateParam ?? "all"} onValueChange={handleStateChange}>
              <SelectTrigger className="h-8 text-sm w-36 shrink-0" aria-label="Filter by state">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eventParam ?? "all"} onValueChange={handleEventChange}>
              <SelectTrigger className="h-8 text-sm w-44 shrink-0" aria-label="Filter by event">
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                {WEBHOOK_EVENTS.map((ev) => (
                  <SelectItem key={ev.value} value={ev.value}>
                    {ev.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <PageState
            resolution={pageState}
            loading={
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            }
            empty={
              !isOnline ? (
                <EmptyState
                  className={PM_FILL_PANEL}
                  illustrationPreset="automations"
                  title="You are offline"
                  description="Webhooks cannot be configured while offline."
                />
              ) : hasActiveFilters ? (
                <EmptyState
                  className={PM_FILL_PANEL}
                  illustrationPreset="automations"
                  title="No webhooks match"
                  description="Try adjusting the filters above."
                />
              ) : (
                <EmptyState
                  className={PM_FILL_PANEL}
                  illustrationPreset="automations"
                  title="No webhooks configured"
                  description="Get notified in real-time when tickets, sprints, or members change."
                  action={
                    canManage
                      ? { label: "Create Webhook", onClick: handleShowForm }
                      : undefined
                  }
                />
              )
            }
            onRetry={handleRetry}
            className="flex-1"
          >
            <PmStaggerList
              className="space-y-2.5"
              role="list"
              aria-label="Webhooks"
            >
              <AnimatePresence initial={false}>
                {(webhooks ?? []).map((wh) => (
                  <div key={wh.id} role="listitem">
                    <WebhookCard
                      webhook={wh}
                      projectId={projectId}
                      onDelete={handleDelete}
                      onToggle={canManage ? handleToggle : undefined}
                      canManage={canManage}
                    />
                  </div>
                ))}
              </AnimatePresence>
            </PmStaggerList>
          </PageState>
        </PmSection>
      </PmPageShell>

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md overflow-hidden">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Webhook</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            <Form {...form}>
              <form
                id="webhook-form"
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Payload URL
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/webhook"
                          className="text-sm font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="events"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Events to subscribe
                      </FormLabel>
                      <div className="grid grid-cols-2 gap-1.5">
                        {WEBHOOK_EVENTS.map((ev) => (
                          <label
                            key={ev.value}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all duration-150 select-none",
                              field.value.includes(ev.value)
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border hover:border-border/80 bg-card",
                            )}
                          >
                            <Checkbox
                              checked={field.value.includes(ev.value)}
                              onCheckedChange={subscribeToEvent(
                                field.onChange,
                                field.value,
                                ev.value,
                              )}
                              className="h-3.5 w-3.5"
                            />
                            <span className="text-xs font-medium">
                              {ev.label}
                            </span>
                          </label>
                        ))}
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Signing Secret{" "}
                        <span className="text-muted-foreground font-normal">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Used to sign payloads"
                          type="password"
                          className="text-sm font-mono"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelForm}>
                Cancel
              </Button>
              <LoadingButton
                size="sm"
                type="submit"
                form="webhook-form"
                isPending={createWebhook.isPending}
                loadingText="Creating…"
              >
                Create Webhook
              </LoadingButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
