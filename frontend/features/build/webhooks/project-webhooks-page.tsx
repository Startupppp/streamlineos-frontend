"use client";

import { useState, useCallback, useMemo, useRef } from "react";
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
import { isApiError } from "@/lib/api-envelope";
import { WebhookBulkBar } from "@/features/build/webhooks/webhook-bulk-bar";
import {
  WebhookConflictDialog,
  diffWebhookConflictFields,
  type WebhookConflictPatch,
} from "@/features/build/webhooks/webhook-conflict-dialog";
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
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { LoadingButton } from "@/components/ui/loading-button";
import { WebhookCard } from "@/features/build/settings/webhook-card";
import {
  webhookSchema,
  type WebhookFormValues,
} from "@/features/build/webhooks/webhook-schema";
import { setListMembership } from "@/lib/toggle-in-list";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  BUILD_CURSOR_STACK_PARAM,
  useBuildCursorPager,
} from "@/features/build/shared/use-build-cursor-pager";
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
  const [editingWebhook, setEditingWebhook] = useState<ProjectWebhook | null>(null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [bulkPending, setBulkPending] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [conflict, setConflict] = useState<{
    webhookId: number;
    patch: WebhookConflictPatch;
  } | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const stateParam = searchParams.get("state") as "active" | "inactive" | null;
  const eventParam = searchParams.get("event") ?? undefined;
  const qParam = searchParams.get("q") ?? undefined;
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;

  const [qInput, setQInput] = useState(qParam ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pager = useBuildCursorPager(
    `${stateParam ?? ""}|${eventParam ?? ""}|${qParam ?? ""}|${fromParam ?? ""}|${toParam ?? ""}`,
  );
  const cursorParam = pager.cursor ? Number(pager.cursor) : undefined;

  const filters =
    stateParam || eventParam || qParam || cursorParam !== undefined || fromParam || toParam
      ? {
          state: stateParam ?? undefined,
          event: eventParam,
          q: qParam,
          cursor: cursorParam,
          from: fromParam,
          to: toParam,
        }
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
      params.delete(BUILD_CURSOR_STACK_PARAM);
      setSelectedIds(new Set<number>());
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

  const handleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateUrl({ from: e.target.value || undefined });
    },
    [updateUrl],
  );

  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateUrl({ to: e.target.value || undefined });
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
    data: webhookPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useWebhooks(projectId, filters);
  const webhooks = webhookPage?.data;

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

  const handleMutationError = useCallback(
    (error: unknown, webhookId: number, patch: WebhookConflictPatch) => {
      if (isApiError(error) && error.status === 409) {
        setConflict({ webhookId, patch });
        void refetch();
        return;
      }
      toast.error(getErrorMessage(error));
    },
    [refetch],
  );

  const handleSubmit = useCallback(
    (values: WebhookFormValues) => {
      if (editingWebhook) {
        updateWebhook.mutate(
          { webhookId: editingWebhook.id, version: editingWebhook.version, url: values.url, events: values.events },
          {
            onSuccess: () => {
              form.reset();
              setSheetOpen(false);
              setEditingWebhook(null);
              toast.success("Webhook updated");
            },
            onError: (e) =>
              handleMutationError(e, editingWebhook.id, {
                url: values.url,
                events: values.events,
              }),
          },
        );
      } else {
        createWebhook.mutate(
          { url: values.url, events: values.events, secret: values.secret || undefined },
          {
            onSuccess: () => {
              form.reset();
              setSheetOpen(false);
              toast.success("Webhook created");
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          },
        );
      }
    },
    [createWebhook, updateWebhook, editingWebhook, form, handleMutationError],
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
    (webhook: Pick<ProjectWebhook, "id" | "version">, isActive: boolean) => {
      updateWebhook.mutate(
        { webhookId: webhook.id, version: webhook.version, isActive },
        {
          onSuccess: () =>
            toast.success(isActive ? "Webhook enabled" : "Webhook disabled"),
          onError: (e) => handleMutationError(e, webhook.id, { isActive }),
        },
      );
    },
    [updateWebhook, handleMutationError],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEdit = useCallback(
    (webhook: ProjectWebhook) => {
      setEditingWebhook(webhook);
      form.reset({ url: webhook.url, events: webhook.events, secret: "" });
      setSheetOpen(true);
    },
    [form],
  );

  const handleCancelForm = useCallback(() => {
    setSheetOpen(false);
    setEditingWebhook(null);
    form.reset();
  }, [form]);

  const handleShowForm = useCallback(() => setSheetOpen(true), []);
  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  const webhookList = useMemo(() => webhooks ?? [], [webhooks]);
  const nextCursor = webhookPage?.nextCursor ?? null;
  const handleNextPage = useCallback(() => {
    pager.goNext(nextCursor === null ? undefined : String(nextCursor));
  }, [pager, nextCursor]);
  const handleExpandedChange = useCallback(
    (webhookId: number, next: boolean) => {
      setExpandedId(next ? webhookId : null);
    },
    [],
  );
  const handleOpenWebhook = useCallback(
    (index: number) => {
      const focused = webhookList[index];
      if (!focused) return;
      setExpandedId((prev) => (prev === focused.id ? null : focused.id));
    },
    [webhookList],
  );
  const handleClearWebhookSelection = useCallback(() => {
    setSelectedIds(new Set<number>());
  }, []);
  const handleSelectedChange = useCallback(
    (webhookId: number, selected: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (selected) {
          next.add(webhookId);
        } else {
          next.delete(webhookId);
        }
        return next;
      });
    },
    [],
  );
  const handleDensityToggle = useCallback(() => {
    setDensity((prev) => (prev === "compact" ? "comfortable" : "compact"));
  }, []);

  const selectedWebhooks = useMemo(
    () => webhookList.filter((wh) => selectedIds.has(wh.id)),
    [webhookList, selectedIds],
  );

  const reportBulkOutcome = useCallback(
    (
      verb: string,
      results: PromiseSettledResult<unknown>[],
      rows: ProjectWebhook[],
    ) => {
      const failed = rows.filter((_, i) => results[i]?.status === "rejected");
      const succeeded = rows.length - failed.length;
      if (failed.length === 0) {
        toast.success(`${succeeded} webhook${succeeded === 1 ? "" : "s"} ${verb}`);
        return;
      }
      toast.error(
        `${succeeded} of ${rows.length} ${verb}. Failed: ${failed
          .map((row) => row.url)
          .join(", ")}`,
      );
    },
    [],
  );

  const handleBulkActive = useCallback(
    (isActive: boolean) => {
      const rows = selectedWebhooks;
      if (rows.length === 0) return;
      setBulkPending(true);
      void Promise.allSettled(
        rows.map((row) =>
          updateWebhook.mutateAsync({
            webhookId: row.id,
            version: row.version,
            isActive,
          }),
        ),
      ).then((results) => {
        setBulkPending(false);
        setSelectedIds(new Set<number>());
        reportBulkOutcome(isActive ? "enabled" : "disabled", results, rows);
      });
    },
    [selectedWebhooks, updateWebhook, reportBulkOutcome],
  );

  const handleBulkEnable = useCallback(
    () => handleBulkActive(true),
    [handleBulkActive],
  );
  const handleBulkDisable = useCallback(
    () => handleBulkActive(false),
    [handleBulkActive],
  );

  const handleBulkDelete = useCallback(() => {
    const rows = selectedWebhooks;
    if (rows.length === 0) return;
    setBulkPending(true);
    void Promise.allSettled(
      rows.map((row) => deleteWebhook.mutateAsync(row.id)),
    ).then((results) => {
      setBulkPending(false);
      setSelectedIds(new Set<number>());
      reportBulkOutcome("deleted", results, rows);
    });
  }, [selectedWebhooks, deleteWebhook, reportBulkOutcome]);

  const conflictServerWebhook =
    conflict === null
      ? undefined
      : webhookList.find((wh) => wh.id === conflict.webhookId);

  const conflictFields =
    conflict === null || conflictServerWebhook === undefined
      ? []
      : diffWebhookConflictFields(conflict.patch, conflictServerWebhook);

  const handleConflictDiscard = useCallback(() => setConflict(null), []);

  const handleConflictKeepMine = useCallback(() => {
    if (conflict === null || conflictServerWebhook === undefined) {
      setConflict(null);
      return;
    }
    const { webhookId, patch } = conflict;
    updateWebhook.mutate(
      { webhookId, version: conflictServerWebhook.version, ...patch },
      {
        onSuccess: () => {
          setConflict(null);
          toast.success("Webhook updated");
        },
        onError: (e) => handleMutationError(e, webhookId, patch),
      },
    );
  }, [conflict, conflictServerWebhook, updateWebhook, handleMutationError]);
  const handleEditFocusedWebhook = useCallback(
    (index: number) => {
      const focused = webhookList[index];
      if (focused) handleEdit(focused);
    },
    [webhookList, handleEdit],
  );
  const { focusedIndex } = useBuildListKeyboard({
    itemCount: webhookList.length,
    onOpen: handleOpenWebhook,
    onEdit: canManage && isOnline ? handleEditFocusedWebhook : undefined,
    onCreate: canManage && isOnline ? handleShowForm : undefined,
    onClearSelection: handleClearWebhookSelection,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef,
    enabled: pageState.kind === "ready",
  });

  const hasActiveFilters = !!(stateParam || eventParam || qParam || fromParam || toParam);

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
              ref={searchInputRef}
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
            <Input
              type="date"
              value={fromParam ?? ""}
              onChange={handleFromChange}
              className="h-8 text-sm w-36 shrink-0"
              aria-label="Filter from date"
            />
            <Input
              type="date"
              value={toParam ?? ""}
              onChange={handleToChange}
              className="h-8 text-sm w-36 shrink-0"
              aria-label="Filter to date"
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              aria-pressed={density === "comfortable"}
              onClick={handleDensityToggle}
            >
              {density === "comfortable" ? "Comfortable" : "Compact"}
            </Button>
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
                  className={CONTENT_FILL_PANEL}
                  illustrationPreset="automations"
                  title="You are offline"
                  description="Webhooks cannot be configured while offline."
                />
              ) : hasActiveFilters ? (
                <EmptyState
                  className={CONTENT_FILL_PANEL}
                  illustrationPreset="automations"
                  title="No webhooks match"
                  description="Try adjusting the filters above."
                />
              ) : (
                <EmptyState
                  className={CONTENT_FILL_PANEL}
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
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {canManage && selectedIds.size > 0 && (
                <WebhookBulkBar
                  selectedCount={selectedIds.size}
                  canEnable={selectedWebhooks.every((wh) => !wh.isActive)}
                  canDisable={selectedWebhooks.every((wh) => wh.isActive)}
                  isPending={bulkPending}
                  onEnable={handleBulkEnable}
                  onDisable={handleBulkDisable}
                  onDelete={handleBulkDelete}
                  onClear={handleClearWebhookSelection}
                />
              )}
              <PmStaggerList
                className="space-y-2.5"
                role="list"
                aria-label="Webhooks"
              >
                <AnimatePresence initial={false}>
                  {webhookList.map((wh, index) => (
                    <div key={wh.id} role="listitem">
                      <WebhookCard
                        webhook={wh}
                        projectId={projectId}
                        onDelete={handleDelete}
                        onToggle={canManage ? handleToggle : undefined}
                        onEdit={canManage ? handleEdit : undefined}
                        canManage={canManage}
                        density={density}
                        focused={index === focusedIndex}
                        expanded={expandedId === wh.id}
                        onExpandedChange={handleExpandedChange}
                        selected={selectedIds.has(wh.id)}
                        onSelectedChange={
                          canManage ? handleSelectedChange : undefined
                        }
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </PmStaggerList>
              <TablePagination
                mode="cursor"
                rowCount={webhookList.length}
                hasMore={webhookPage?.hasMore ?? false}
                hasPrevious={pager.hasPrevious}
                onNext={handleNextPage}
                onPrevious={pager.goPrevious}
                hideOnSinglePage
              />
            </div>
          </PageState>
        </PmSection>
      </PmPageShell>

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />

      <WebhookConflictDialog
        open={conflict !== null}
        fields={conflictFields}
        isReapplying={updateWebhook.isPending}
        onKeepMine={handleConflictKeepMine}
        onDiscard={handleConflictDiscard}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-md overflow-hidden">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>{editingWebhook ? "Edit Webhook" : "New Webhook"}</SheetTitle>
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

                {!editingWebhook && (
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
                )}
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
                isPending={editingWebhook ? updateWebhook.isPending : createWebhook.isPending}
                loadingText={editingWebhook ? "Saving…" : "Creating…"}
              >
                {editingWebhook ? "Save Changes" : "Create Webhook"}
              </LoadingButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
