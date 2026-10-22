"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { PageState } from "@/components/shared/page-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { TabsContent } from "@/components/ui/tabs";
import { ProductSettingsSkeleton } from "./managed-product-page-skeletons";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import { useUpdateManagedProduct } from "@/hooks/api/build/managed-product-mutations";
import { isWriteConflict } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import {
  editManagedProductSchema,
  type EditManagedProductFormValues,
  toEditManagedProductInput,
} from "./managed-product-schema";
import { ManagedProductEditFields } from "./managed-product-edit-fields";
import { ProductSettingsActionsSection } from "./product-settings-actions-section";
import { ProductSettingsMembersSection } from "./product-settings-members-section";
import { ProductSettingsPublicationSection } from "./product-settings-publication-section";
import { ProductSettingsFeedbackChannelsSection } from "./product-settings-feedback-channels-section";

const FORM_ID = "product-settings-form";

function toFormStatus(status: string): EditManagedProductFormValues["status"] {
  return status === "archived" ? "archived" : "active";
}

interface ProductSettingsFormProps {
  managedProductId: number;
}

export function ProductSettingsForm({
  managedProductId,
}: ProductSettingsFormProps) {
  const canUpdatePermission = useCan("build:managed-products:update");
  const [isConflict, setIsConflict] = useState(false);

  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
  } = useManagedProduct(managedProductId);

  const updateProduct = useUpdateManagedProduct();
  const canUpdate =
    canUpdatePermission &&
    (product?.allowedActions?.includes("update") ?? false);

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
          roadmapDefaultHorizon: product.roadmapDefaultHorizon ?? null,
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
  const capturedVersionRef = useRef<number | null>(null);

  useEffect(() => {
    if (product && !isDirty) capturedVersionRef.current = product.version;
  }, [isDirty, product]);

  useRegisterDirtyState(isDirty);

  const pageState = usePageState({
    permission: "build:managed-products:view",
    isLoading,
    isError,
    error,
    isEmpty: product === null,
  });

  function handleRetry() {
    void refetch();
  }

  function handleDismissConflict() {
    setIsConflict(false);
    form.reset();
    void refetch();
  }

  function handleSubmit(values: EditManagedProductFormValues) {
    if (!product) return;
    updateProduct.mutate(
      {
        managedProductId,
        ...toEditManagedProductInput(
          values,
          capturedVersionRef.current ?? product.version,
        ),
      },
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
  }

  return (
    <PageState
      resolution={pageState}
      loading={<ProductSettingsSkeleton />}
      onRetry={handleRetry}
      className="max-md:overflow-y-auto"
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
                  <span>
                    This product was updated by someone else. Reload to see the
                    latest version.
                  </span>
                  <button
                    type="button"
                    className="ml-4 shrink-0 font-medium underline"
                    onClick={handleDismissConflict}
                  >
                    Reload
                  </button>
                </div>
              ) : null}

              <section
                aria-labelledby="identity-section-heading"
                className="flex flex-col gap-4"
              >
                <h2
                  id="identity-section-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Identity, strategy &amp; lifecycle
                </h2>
                <ManagedProductEditFields
                  form={form}
                  formId={FORM_ID}
                  onSubmit={handleSubmit}
                />
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

              <ProductSettingsActionsSection
                managedProductId={managedProductId}
                product={product}
                canUpdate={canUpdate}
              />
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-0 outline-none">
            <ProductSettingsMembersSection
              managedProductId={managedProductId}
              canWrite={canUpdate}
            />
          </TabsContent>

          <TabsContent value="publishing" className="mt-0 outline-none">
            <ProductSettingsPublicationSection
              managedProductId={managedProductId}
            />
          </TabsContent>

          <TabsContent value="feedback-channels" className="mt-0 outline-none">
            <ProductSettingsFeedbackChannelsSection
              managedProductId={managedProductId}
            />
          </TabsContent>
        </div>
      ) : null}
    </PageState>
  );
}
