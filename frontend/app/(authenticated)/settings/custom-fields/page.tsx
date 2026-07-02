"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CustomFieldList } from "@/features/settings/custom-fields/custom-field-list";

export default function CustomFieldsPage() {
  return (
    <PageWrapper
      title="Custom Fields"
      subtitle="Define custom data fields for leads, deals, and contacts"
    >
      <Tabs defaultValue="lead">
        <TabsList className="mb-4">
          <TabsTrigger value="lead">Leads</TabsTrigger>
          <TabsTrigger value="deal">Deals</TabsTrigger>
          <TabsTrigger value="contact">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="lead">
          <CustomFieldList entityType="lead" />
        </TabsContent>
        <TabsContent value="deal">
          <CustomFieldList entityType="deal" />
        </TabsContent>
        <TabsContent value="contact">
          <CustomFieldList entityType="contact" />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
