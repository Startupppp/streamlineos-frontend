"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgTokensTab } from "@/features/settings/api-tokens/org-tokens-tab";
import { PersonalTokensTab } from "@/features/settings/api-tokens/personal-tokens-tab";

export default function ApiTokensPage() {
  const [activeTab, setActiveTab] = useState("personal");
  const [createPersonalOpen, setCreatePersonalOpen] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  const handleNewToken = useCallback(() => {
    if (activeTab === "personal") setCreatePersonalOpen(true);
    else setCreateOrgOpen(true);
  }, [activeTab]);

  return (
    <PageWrapper
      title="API Tokens"
      subtitle="Create and manage tokens for programmatic access."
      actions={
        <Button size="sm" onClick={handleNewToken}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Token
        </Button>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 min-h-0 flex-col">
          <TabsList className="mb-3 h-8 shrink-0">
            <TabsTrigger value="personal" className="text-xs h-7">Personal</TabsTrigger>
            <TabsTrigger value="organization" className="text-xs h-7">Organization</TabsTrigger>
          </TabsList>
          <TabsContent value="personal" className="mt-0 flex flex-1 min-h-0 flex-col">
            <PersonalTokensTab
              showCreate={createPersonalOpen}
              onShowCreateChange={setCreatePersonalOpen}
            />
          </TabsContent>
          <TabsContent value="organization" className="mt-0 flex flex-1 min-h-0 flex-col">
            <OrgTokensTab
              showCreate={createOrgOpen}
              onShowCreateChange={setCreateOrgOpen}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
