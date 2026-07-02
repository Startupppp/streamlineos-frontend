"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgTokensTab } from "@/features/settings/api-tokens/org-tokens-tab";
import { PersonalTokensTab } from "@/features/settings/api-tokens/personal-tokens-tab";

export default function ApiTokensPage() {
  return (
    <PageWrapper
      title="API Tokens"
      subtitle="Manage organization-wide and personal API tokens for programmatic access."
    >
      <Tabs defaultValue="personal">
        <TabsList className="mb-4">
          <TabsTrigger value="personal">Personal Access Tokens</TabsTrigger>
          <TabsTrigger value="organization">Organization Tokens</TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <PersonalTokensTab />
        </TabsContent>
        <TabsContent value="organization">
          <OrgTokensTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
