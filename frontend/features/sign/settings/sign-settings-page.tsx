"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageState } from "@/hooks/api/use-page-state";
import { useSignSettings } from "@/hooks/api/sign/settings";
import { GeneralSettingsForm } from "./general-settings-form";
import { BrandingSettingsForm } from "./branding-settings-form";
import { WatermarkPoliciesPanel } from "./watermark-policies-panel";
import { SweepStatusPanel } from "./sweep-status-panel";

const SETTINGS_TITLE = "Settings";
const SETTINGS_SUBTITLE = "Tenant-wide defaults, branding, and watermark policy for Sign OS";

export function SignSettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="space-y-2 border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid gap-2 border-b border-border px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7.5rem] sm:items-center">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
        <div className="flex justify-end px-4 py-3">
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function SignSettingsPage() {
  const settingsQuery = useSignSettings();
  const pageState = usePageState({
    permission: "sign:admin:manage",
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    error: settingsQuery.error,
  });

  function handleRetry() {
    void settingsQuery.refetch();
  }

  return (
    <PageWrapper
      title={SETTINGS_TITLE}
      subtitle={SETTINGS_SUBTITLE}
      state={pageState}
      loading={<SignSettingsSkeleton />}
      onRetry={handleRetry}
    >
      <Tabs defaultValue="general" className="gap-0">
        <div className="sticky top-0 z-10 bg-background pb-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="watermarks">Watermarks</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="general" className="space-y-4">
          <GeneralSettingsForm />
          <SweepStatusPanel />
        </TabsContent>
        <TabsContent value="branding">
          <BrandingSettingsForm />
        </TabsContent>
        <TabsContent value="watermarks">
          <WatermarkPoliciesPanel />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
