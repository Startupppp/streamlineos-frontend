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
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={handleNewToken}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Token
          </Button>
        </div>
        <TabsContent value="personal">
          <PersonalTokensTab
            showCreate={createPersonalOpen}
            onShowCreateChange={setCreatePersonalOpen}
          />
        </TabsContent>
        <TabsContent value="organization">
          <OrgTokensTab
            showCreate={createOrgOpen}
            onShowCreateChange={setCreateOrgOpen}
          />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
