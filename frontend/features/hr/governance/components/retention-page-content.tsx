"use client";

import { useState } from "react";
import { RetentionPoliciesTab } from "./retention-policies-tab";
import { DataRequestsTab } from "./data-requests-tab";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";

const ACTIVE_TABS = ["policies", "requests"] as const;
type ActiveTab = (typeof ACTIVE_TABS)[number];

export function RetentionPageContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("policies");

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => {
        const tab = ACTIVE_TABS.find((candidate) => candidate === v);
        if (tab) setActiveTab(tab);
      }}
      className="flex flex-1 min-h-0 flex-col gap-4"
    >
      <TabsList className="shrink-0">
        <TabsTrigger value="policies">Retention Policies</TabsTrigger>
        <TabsTrigger value="requests">Data Requests</TabsTrigger>
      </TabsList>
      <TabsContent value="policies" className={TABS_CONTENT_PAGE_BODY_CLASS}>
        <RetentionPoliciesTab />
      </TabsContent>
      <TabsContent value="requests" className={TABS_CONTENT_PAGE_BODY_CLASS}>
        <DataRequestsTab />
      </TabsContent>
    </Tabs>
  );
}
