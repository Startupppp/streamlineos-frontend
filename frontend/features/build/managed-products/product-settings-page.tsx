"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DirtyStateProvider, useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageState } from "@/components/shared/page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { ProductSettingsSkeleton } from "./managed-product-page-skeletons";
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
import { ProductSettingsDangerSection } from "./product-settings-danger-section";
import { ProductSettingsMembersSection } from "./product-settings-members-section";
import { ProductSettingsPublicationSection } from "./product-settings-publication-section";
import {
  PRODUCT_SETTINGS_TABS,
  productSettingsTabFromParam,
} from "./product-settings-tabs";

interface ProductSettingsPageProps {
  managedProductId: number;
}

const SETTINGS_FILTER_DEFINITIONS = [
  {
    param: "tab",
    all: "general",
    options: PRODUCT_SETTINGS_TABS.map((tab) => tab.id),
  },
] as const;

const FORM_ID = "product-settings-form";

function toFormStatus(status: string): EditManagedProductFormValues["status"] {
  return status === "archived" ? "archived" : "active";
}

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
          status: toFormStatus(product.status),
          lifecycle: product.lifecycle ?? undefined,
          health: product.health ?? undefined,
          teamId: product.teamId,
          segments: product.segments,
          tags: product.tags,
          northStarMetric: product.northStarMetric ?? undefined,
          successMetrics: product.successMetrics ?? [],
          vision: product.vision ?? undefined,
          missionStatement: product.missionStatement ?? undefined,
          targetCustomer: product.targetCustomer ?? undefined,
          differentiators: product.differentiators ?? undefined,
        }
      : undefined,
    resetOptions: { keepDirtyValues: true, keepDirty: true },
  });

  const isDirty = form.formState.isDirty;
  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  if (product && !isDirty && baseVersion !== product.version) setBaseVersion(product.version);
  useRegisterDirtyState(isDirty);

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
    form.reset();
    void refetch();
  }, [refetch, form]);

  const handleSubmit = useCallback(
    (values: EditManagedProductFormValues) => {
      if (!product) return;
      updateProduct.mutate(
        { managedProductId, ...toEditManagedProductInput(values, baseVersion ?? product.version) },
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
    [product, updateProduct, managedProductId, form, baseVersion],
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
      loading={<ProductSettingsSkeleton />}
      onRetry={handleRetry}
      className="flex-1"
    >
      {product ? (
        <div className="flex max-w-2xl flex-col gap-8 pb-12">
          <TabsContent value="general" forceMount>
            <div className="flex flex-col gap-8">
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
                      disabled={!isDirty}
                    >
                      Save changes
                    </LoadingButton>
                  </div>
                ) : null}
              </section>

              <ProductSettingsDangerSection
                archived={product.status === "archived"}
                canUpdate={canUpdate}
                archivePending={archiveProduct.isPending}
                restorePending={restoreProduct.isPending}
                onArchive={() => setArchiveOpen(true)}
                onRestore={() => setRestoreOpen(true)}
              />
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-0 outline-none">
            <ProductSettingsMembersSection managedProductId={managedProductId} />
          </TabsContent>

          <TabsContent value="publishing" className="mt-0 outline-none">
            <ProductSettingsPublicationSection managedProductId={managedProductId} />
          </TabsContent>

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
  const router = useRouter();
  const { value, setValue } = useBuildListFilters({
    withSearch: false,
    filters: SETTINGS_FILTER_DEFINITIONS,
  });
  const tab = productSettingsTabFromParam(value("tab"));
  const handleTabChange = useCallback((next: string) => {
    setValue("tab", next);
  }, [setValue]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(`/build/managed-products/${managedProductId}`);
    }
  }, [router, managedProductId]);

  return (
    <DirtyStateProvider>
      <Tabs value={tab} onValueChange={handleTabChange} className="h-full min-h-0 min-w-0 flex-1">
        <PageWrapper
          title="Settings"
          subtitle="Configure this product"
          onBack={handleBack}
          filters={
            <PageTabsToolbar
              tabs={
                <TabsList aria-label="Settings sections">
                  {PRODUCT_SETTINGS_TABS.map((item) => (
                    <TabsTrigger key={item.id} value={item.id} className="px-2 sm:px-3">
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              }
            />
          }
        >
          <ProductSettingsForm managedProductId={managedProductId} />
        </PageWrapper>
      </Tabs>
    </DirtyStateProvider>
  );
}
