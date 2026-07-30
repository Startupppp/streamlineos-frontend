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

type ActiveTab = "policies" | "requests";

export function RetentionPageContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("policies");

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="mb-6">
      <TabsList>
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
