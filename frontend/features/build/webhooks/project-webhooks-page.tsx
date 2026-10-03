"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { WebhookBulkBar } from "@/features/build/webhooks/webhook-bulk-bar";
import { WebhookFormSheet } from "@/features/build/webhooks/webhook-form-sheet";
import { WebhookFilterToolbar } from "@/features/build/webhooks/webhook-filter-toolbar";
import { WebhookConflictDialog } from "@/features/build/webhooks/webhook-conflict-dialog";
import { useWebhookListCommands } from "@/features/build/webhooks/use-webhook-list-commands";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useWebhooks,
  useCreateWebhook,
  type ProjectWebhook,
} from "@/hooks/api/build/webhooks";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { WebhookCard } from "@/features/build/settings/webhook-card";
import {
  webhookSchema,
  type WebhookFormValues,
} from "@/features/build/webhooks/webhook-schema";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  BUILD_CURSOR_STACK_PARAM,
  useBuildCursorPager,
} from "@/features/build/shared/use-build-cursor-pager";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { useOnlineStatus } from "@/hooks/common/use-online-status";

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
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawStateParam = searchParams.get("state");
  const stateParam: "active" | "inactive" | null =
    rawStateParam === "active" || rawStateParam === "inactive" ? rawStateParam : null;
  const eventParam = searchParams.get("event") ?? undefined;
  const qParam = searchParams.get("q") ?? undefined;
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;

  const [qInput, setQInput] = useState(qParam ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filterKey = `${stateParam ?? ""}|${eventParam ?? ""}|${qParam ?? ""}|${fromParam ?? ""}|${toParam ?? ""}`;
  const pager = useBuildCursorPager(filterKey);
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
    (value: string) => {
      updateUrl({ from: value || undefined });
    },
    [updateUrl],
  );

  const handleToChange = useCallback(
    (value: string) => {
      updateUrl({ to: value || undefined });
    },
    [updateUrl],
  );

  const handleQChange = useCallback(
    (value: string) => {
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
  const webhookList = useMemo(() => webhooks ?? [], [webhooks]);
  const commands = useWebhookListCommands({
    projectId,
    webhookList,
    refetch,
    resetKey: `${filterKey}|${pager.cursor ?? ""}`,
  });
  const updateWebhook = commands.updateWebhook;

  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: "", events: [], secret: "" },
  });
  useRegisterDirtyState(sheetOpen && form.formState.isDirty);

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
              commands.handleMutationError(e, editingWebhook.id, {
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
    [createWebhook, updateWebhook, editingWebhook, form, commands],
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
  const handleDensityToggle = useCallback(() => {
    setDensity((prev) => (prev === "compact" ? "comfortable" : "compact"));
  }, []);

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
    onClearSelection: commands.clearSelection,
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
          <WebhookFilterToolbar
            searchInputRef={searchInputRef}
            search={qInput}
            state={stateParam}
            event={eventParam}
            from={fromParam}
            to={toParam}
            density={density}
            onSearchChange={handleQChange}
            onStateChange={handleStateChange}
            onEventChange={handleEventChange}
            onFromChange={handleFromChange}
            onToChange={handleToChange}
            onDensityToggle={handleDensityToggle}
          />
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {canManage && isOnline && commands.selectedIds.size > 0 && (
                <WebhookBulkBar
                  selectedCount={commands.selectedIds.size}
                  canEnable={commands.selectedWebhooks.every((wh) => !wh.isActive)}
                  canDisable={commands.selectedWebhooks.every((wh) => wh.isActive)}
                  isPending={commands.bulkPending}
                  onEnable={commands.handleBulkEnable}
                  onDisable={commands.handleBulkDisable}
                  onDelete={commands.handleBulkDelete}
                  onClear={commands.clearSelection}
                />
              )}
              <div className="min-h-0 flex-1 overflow-y-auto">
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
                          onDelete={commands.handleDelete}
                          onToggle={canManage ? commands.handleToggle : undefined}
                          onEdit={canManage ? handleEdit : undefined}
                          canManage={canManage}
                          density={density}
                          focused={index === focusedIndex}
                          expanded={expandedId === wh.id}
                          onExpandedChange={handleExpandedChange}
                          selected={commands.selectedIds.has(wh.id)}
                          onSelectedChange={
                            canManage ? commands.handleSelectedChange : undefined
                          }
                        />
                      </div>
                    ))}
                  </AnimatePresence>
                </PmStaggerList>
              </div>
              <TablePagination
                mode="cursor"
                rowCount={webhookList.length}
                pageNumber={pager.pageNumber}
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
        open={commands.conflictOpen}
        fields={commands.conflictFields}
        isReapplying={updateWebhook.isPending}
        onKeepMine={commands.handleConflictKeepMine}
        onDiscard={commands.handleConflictDiscard}
      />

      <WebhookFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isEditing={editingWebhook !== null}
        isPending={editingWebhook ? updateWebhook.isPending : createWebhook.isPending}
        form={form}
        onSubmit={handleSubmit}
        onCancel={handleCancelForm}
      />
    </PageWrapper>
  );
}
