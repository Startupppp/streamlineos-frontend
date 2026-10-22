"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirtyStateProvider } from "@/components/shared/dirty-state-context";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import {
  PRODUCT_SETTINGS_TABS,
  productSettingsTabFromParam,
} from "./product-settings-tabs";
import { useProductReturn } from "@/features/build/shared/use-product-return";
import { ManagedProductNotFound } from "./managed-product-detail-layout";
import { ProductSettingsForm } from "./product-settings-form";

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

export function ProductSettingsPage({
  managedProductId,
}: ProductSettingsPageProps) {
  const productQuery = useManagedProduct(managedProductId);
  const { value, setValue } = useBuildListFilters({
    withSearch: false,
    filters: SETTINGS_FILTER_DEFINITIONS,
  });
  const tab = productSettingsTabFromParam(value("tab"));

  function handleTabChange(next: string) {
    setValue("tab", next);
  }

  const { handleBack } = useProductReturn(`/build/managed-products/${managedProductId}`);

  if (productQuery.isSuccess && productQuery.data === null) {
    return <ManagedProductNotFound />;
  }

  return (
    <DirtyStateProvider>
      <Tabs
        value={tab}
        onValueChange={handleTabChange}
        className="h-full min-h-0 min-w-0 flex-1"
      >
        <PageWrapper
          title="Settings"
          subtitle="Configure this product"
          onBack={handleBack}
          filters={
            <PageTabsToolbar
              tabs={
                <TabsList aria-label="Settings sections">
                  {PRODUCT_SETTINGS_TABS.map((item) => (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className="px-2 sm:px-3"
                    >
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
