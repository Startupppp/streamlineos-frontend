"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettingsForm } from "./general-settings-form";
import { BrandingSettingsForm } from "./branding-settings-form";
import { WatermarkPoliciesPanel } from "./watermark-policies-panel";
import { SweepStatusPanel } from "./sweep-status-panel";

export function SignSettingsPage() {
  return (
    <PageWrapper title="Settings" subtitle="Tenant-wide defaults, branding, and watermark policy for SignOS">
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="watermarks">Watermarks</TabsTrigger>
        </TabsList>
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
