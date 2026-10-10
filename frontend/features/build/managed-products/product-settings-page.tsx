"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DirtyStateProvider, useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import {
  useUpdateManagedProduct,
  useArchiveManagedProduct,
  useRestoreManagedProduct,
} from "@/hooks/api/build/managed-product-mutations";
import { isWriteConflict } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import {
  editManagedProductSchema,
  type EditManagedProductFormValues,
  toEditManagedProductInput,
} from "./managed-product-schema";
import { ManagedProductEditFields } from "./managed-product-edit-fields";
import { ProductSettingsMembersSection } from "./product-settings-members-section";
import { ProductSettingsReleasesSection } from "./product-settings-releases-section";

interface ProductSettingsPageProps {
  managedProductId: number;
}

const FORM_ID = "product-settings-form";

function ProductSettingsForm({ managedProductId }: ProductSettingsPageProps) {
  const canUpdate = useCan("build:managed-products:update");
  const [isConflict, setIsConflict] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
  } = useManagedProduct(managedProductId);

  const updateProduct = useUpdateManagedProduct();
  const archiveProduct = useArchiveManagedProduct();
  const restoreProduct = useRestoreManagedProduct();

  const form = useForm<EditManagedProductFormValues>({
    resolver: zodResolver(editManagedProductSchema),
    defaultValues: {
      name: "",
      description: "",
      ownerId: "",
      status: "active",
      segments: [],
      tags: [],
      successMetrics: [],
    },
    values: product
      ? {
          name: product.name,
          description: product.description ?? "",
          ownerId: product.ownerId ?? "",
          status: product.status as "active" | "archived",
          lifecycle: product.lifecycle ?? undefined,
          health: product.health ?? undefined,
          teamId: product.teamId,
          segments: product.segments,
          tags: product.tags,
          northStarMetric: product.northStarMetric ?? undefined,
          successMetrics: product.successMetrics,
          vision: product.vision ?? undefined,
          missionStatement: product.missionStatement ?? undefined,
          targetCustomer: product.targetCustomer ?? undefined,
          differentiators: product.differentiators ?? undefined,
        }
      : undefined,
  });

  useRegisterDirtyState(form.formState.isDirty);

  const pageState = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: product === null,
  });

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleDismissConflict = useCallback(() => {
    setIsConflict(false);
    void refetch();
  }, [refetch]);

  const handleSubmit = useCallback(
    (values: EditManagedProductFormValues) => {
      if (!product) return;
      updateProduct.mutate(
        { managedProductId, ...toEditManagedProductInput(values, product.version) },
        {
          onSuccess: () => {
            toast.success("Settings saved.");
            form.reset(values);
          },
          onError: (e) => {
            if (isWriteConflict(e)) setIsConflict(true);
            else toast.error(getErrorMessage(e));
          },
        },
      );
    },
    [product, updateProduct, managedProductId, form],
  );

  function handleArchiveConfirm() {
    if (!product) return;
    archiveProduct.mutate(
      { managedProductId, version: product.version },
      {
        onSuccess: () => {
          toast.success("Product archived.");
          setArchiveOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleRestoreConfirm() {
    if (!product) return;
    restoreProduct.mutate(
      { managedProductId, version: product.version },
      {
        onSuccess: () => {
          toast.success("Product restored.");
          setRestoreOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <PageState
      resolution={pageState}
      loading={
        <div className="space-y-3 max-w-2xl">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      }
      onRetry={handleRetry}
      className="flex-1"
    >
      {product ? (
        <div className="flex flex-col gap-8 max-w-2xl pb-12">
          {isConflict ? (
            <div
              role="alert"
              className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <span>This product was updated by someone else. Reload to see the latest version.</span>
              <button
                type="button"
                className="ml-4 shrink-0 font-medium underline"
                onClick={handleDismissConflict}
              >
                Reload
              </button>
            </div>
          ) : null}

          <section aria-labelledby="identity-section-heading" className="flex flex-col gap-4">
            <h2 id="identity-section-heading" className="text-sm font-semibold text-foreground">
              Identity, strategy &amp; lifecycle
            </h2>
            <ManagedProductEditFields form={form} formId={FORM_ID} onSubmit={handleSubmit} />
            {canUpdate ? (
              <div className="flex justify-end pt-2">
                <LoadingButton
                  type="submit"
                  form={FORM_ID}
                  size="sm"
                  isPending={updateProduct.isPending}
                  loadingText="Saving…"
                  disabled={!form.formState.isDirty}
                >
                  Save changes
                </LoadingButton>
              </div>
            ) : null}
          </section>

          <div className="border-t border-border" />

          <ProductSettingsMembersSection managedProductId={managedProductId} />

          <div className="border-t border-border" />

          <ProductSettingsReleasesSection managedProductId={managedProductId} />

          <div className="border-t border-border" />

          <section aria-labelledby="danger-section-heading" className="flex flex-col gap-3">
            <h2 id="danger-section-heading" className="text-sm font-semibold text-destructive">
              Danger zone
            </h2>
            <div className="rounded-md border border-destructive/30 p-4 flex items-start justify-between gap-4">
              {product.status === "archived" ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground">Restore this product</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Make this product active again.
                    </p>
                  </div>
                  {canUpdate ? (
                    <LoadingButton
                      type="button"
                      variant="outline"
                      size="sm"
                      isPending={restoreProduct.isPending}
                      loadingText="Restoring…"
                      onClick={() => setRestoreOpen(true)}
                    >
                      Restore
                    </LoadingButton>
                  ) : null}
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-foreground">Archive this product</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Hide from active views. Can be restored later.
                    </p>
                  </div>
                  {canUpdate ? (
                    <LoadingButton
                      type="button"
                      variant="destructive"
                      size="sm"
                      isPending={archiveProduct.isPending}
                      loadingText="Archiving…"
                      onClick={() => setArchiveOpen(true)}
                    >
                      Archive
                    </LoadingButton>
                  ) : null}
                </>
              )}
            </div>
          </section>

          <ConfirmDialog
            open={archiveOpen}
            onOpenChange={setArchiveOpen}
            title="Archive this product?"
            description="The product will be hidden from active views. You can restore it later."
            confirmLabel="Archive"
            destructive
            onConfirm={handleArchiveConfirm}
          />

          <ConfirmDialog
            open={restoreOpen}
            onOpenChange={setRestoreOpen}
            title="Restore this product?"
            description="The product will become active again."
            confirmLabel="Restore"
            onConfirm={handleRestoreConfirm}
          />
        </div>
      ) : null}
    </PageState>
  );
}

export function ProductSettingsPage({ managedProductId }: ProductSettingsPageProps) {
  return (
    <DirtyStateProvider>
      <PageWrapper title="Settings" subtitle="Configure this product">
        <ProductSettingsForm managedProductId={managedProductId} />
      </PageWrapper>
    </DirtyStateProvider>
  );
}
