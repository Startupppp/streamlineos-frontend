"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
      <div className="flex flex-1 min-h-0 flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 min-h-0 flex-col">
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <TabsList>
              <TabsTrigger value="personal" className="text-xs">
                Personal
              </TabsTrigger>
              <TabsTrigger value="organization" className="text-xs">
                Organization
              </TabsTrigger>
            </TabsList>
            <AnimatedIconButton
              size="sm"
              className="shrink-0"
              onClick={handleNewToken}
              icon={PlusIcon}
              iconSize={14}
              iconClassName="mr-1.5"
            >
              New Token
            </AnimatedIconButton>
          </div>
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
