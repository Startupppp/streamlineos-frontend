"use client";

import { useState, useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { staggerContainer } from "@/lib/motion-variants";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  DEFAULT_PAGE_SIZE,
  getLastPage,
  parsePage,
  parsePageSize,
  STANDARD_PAGE_SIZE_OPTIONS,
} from "@/lib/list-pagination";
import { useCan } from "@/hooks/api/access";
import {
  useWebhooks,
  useToggleWebhook,
  useDeleteWebhook,
  useRotateWebhookSecret,
  type WebhookEndpoint,
} from "@/hooks/api/webhooks";
import { WebhookCard, WebhookCardSkeleton } from "./webhook-card";
import { WebhookCreateSheet } from "./webhook-create-sheet";
import { WebhookDeliveryLogSheet } from "./webhook-delivery-log";
import { WebhookSecretRevealDialog } from "./webhook-secret-reveal-dialog";

export function WebhooksPage() {
  const canManage = useCan("settings:webhooks:manage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const page = parsePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("size"));

  const { data, error, isLoading, isError, refetch } =
    useWebhooks({ page, limit: pageSize });

  const toggleWebhook = useToggleWebhook();
  const deleteWebhook = useDeleteWebhook();
  const rotateSecret = useRotateWebhookSecret();

  const [createOpen, setCreateOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [rotateId, setRotateId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [logsWebhook, setLogsWebhook] = useState<WebhookEndpoint | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  const webhooks = data?.data ?? [];
  const pagination = data?.pagination;
  const isPageOutOfRange =
    !!pagination && page > getLastPage(pagination.total, pageSize);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const handlePageChange = useCallback(
    (nextPage: number) =>
      updateParams({ page: nextPage <= 1 ? null : String(nextPage) }),
    [updateParams],
  );

  const handlePageSizeChange = useCallback(
    (size: number) =>
      updateParams({
        size: size === DEFAULT_PAGE_SIZE ? null : String(size),
        page: null,
      }),
    [updateParams],
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const handleCreated = useCallback(
    (secret: string) => {
      updateParams({ page: null });
      setRevealedSecret(secret);
    },
    [updateParams],
  );

  const handleCloseReveal = useCallback(() => setRevealedSecret(null), []);

  const handleRotateConfirm = useCallback(() => {
    if (rotateId === null) return;
    rotateSecret.mutate(rotateId, {
      onSuccess: (result) => {
        setRotateId(null);
        setRevealedSecret(result.secret);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [rotateId, rotateSecret]);

  const handleRotateDialogChange = useCallback((open: boolean) => {
    if (!open) setRotateId(null);
  }, []);

  const handleToggle = useCallback(
    (id: number, isActive: boolean) => {
      toggleWebhook.mutate(
        { id, isActive: !isActive },
        {
          onSuccess: () =>
            toast.success(isActive ? "Webhook disabled" : "Webhook enabled"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [toggleWebhook],
  );

  const handleDelete = useCallback(() => {
    if (!deleteId) return;
    deleteWebhook.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Webhook deleted");
        setDeleteId(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deleteId, deleteWebhook]);

  const handleViewLogs = useCallback((webhook: WebhookEndpoint) => {
    setLogsWebhook(webhook);
    setLogsOpen(true);
  }, []);

  const handleLogsOpenChange = useCallback((open: boolean) => {
    setLogsOpen(open);
    if (!open) setLogsWebhook(null);
  }, []);

  const handleCopyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  }, []);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Webhooks"
      subtitle="Send real-time events to external systems when actions occur in your organization."
      noInternalScroll
      contentClassName="pb-0"
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-2"
            onClick={handleOpenCreate}
          >
            Add Webhook
          </AnimatedIconButton>
        ) : undefined
      }
    >
      {isLoading || isPageOutOfRange ? (
        <div className="flex flex-1 flex-col min-h-0 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <WebhookCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load webhooks"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : webhooks.length === 0 ? (
        <EmptyState
          illustration={<EmptyDevicesIllustration />}
          title="No webhooks configured"
          description="Webhooks let external services receive real-time notifications when events happen in your organization."
          action={
            canManage
              ? { label: "Add Webhook", onClick: handleOpenCreate }
              : undefined
          }
          className="min-h-0 flex-1"
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <motion.div
            className="min-h-0 flex-1 space-y-4 overflow-y-auto"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {webhooks.map((wh) => (
              <WebhookCard
                key={wh.id}
                webhook={wh}
                onCopyUrl={handleCopyUrl}
                onToggle={handleToggle}
                onDelete={setDeleteId}
                onRotateSecret={setRotateId}
                onViewLogs={handleViewLogs}
                canManage={canManage}
              />
            ))}
          </motion.div>
          <div className="shrink-0 border-t px-3">
            <DataTablePagination
              page={page}
              totalPages={Math.max(1, pagination?.totalPages ?? 1)}
              total={pagination?.total ?? 0}
              limit={pageSize}
              onPageChange={handlePageChange}
              onLimitChange={handlePageSizeChange}
              pageSizeOptions={STANDARD_PAGE_SIZE_OPTIONS}
            />
          </div>
        </div>
      )}

      <WebhookCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      <WebhookDeliveryLogSheet
        webhook={logsWebhook}
        open={logsOpen}
        onOpenChange={handleLogsOpenChange}
        canManage={canManage}
      />

      <WebhookSecretRevealDialog
        secret={revealedSecret}
        onClose={handleCloseReveal}
      />

      {canManage && (
        <AlertDialog
          open={rotateId !== null}
          onOpenChange={handleRotateDialogChange}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rotate signing secret?</AlertDialogTitle>
              <AlertDialogDescription>
                A new secret is generated immediately and the current one stops
                working. Deliveries will fail signature verification until you
                update the receiving service with the new value.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRotateConfirm}>
                Rotate secret
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {canManage && (
        <AlertDialog
          open={deleteId !== null}
          onOpenChange={handleDeleteDialogChange}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
              <AlertDialogDescription>
                This webhook will stop receiving events immediately. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </PageWrapper>
  );
}
