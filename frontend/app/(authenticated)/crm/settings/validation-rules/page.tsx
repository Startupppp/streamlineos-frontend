"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { NoPermissionState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import {
  TABS_CONTENT_PAGE_BODY_CLASS,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ValidationRuleList } from "@/features/crm/settings/validation-rule-list";
import { ValidationRuleSheet } from "@/features/crm/settings/validation-rule-sheet";
import { useCan } from "@/hooks/api/access";
import { useValidationRules } from "@/hooks/api/crm";
import type { CrmValidationEntityType } from "@/types/crm/metadata";

const ENTITY_TABS: { value: CrmValidationEntityType; label: string }[] = [
  { value: "lead", label: "Leads" },
  { value: "deal", label: "Deals" },
  { value: "contact", label: "Contacts" },
  { value: "company", label: "Companies" },
  { value: "quote", label: "Quotes" },
];

function isEntityType(value: string): value is CrmValidationEntityType {
  return ENTITY_TABS.some((tab) => tab.value === value);
}

/**
 * Validation rules, one entity type at a time.
 *
 * Table and form are both generated now. A rule's configuration depends on its
 * type, which `visibleWhen` says in the description — so this page has no idea
 * that a regex rule has a pattern and a numeric one has a limit, and neither
 * does the sheet it opens.
 */
export default function ValidationRulesPage() {
  const canManage = useCan("crm:settings:manage");
  const canView = useCan("crm:settings:view");
  const [activeTab, setActiveTab] = useState<CrmValidationEntityType>("lead");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: rules } = useValidationRules({ entity: activeTab });

  const handleOpenNew = useCallback(() => setSheetOpen(true), []);
  const handleSheetOpenChange = useCallback((open: boolean) => setSheetOpen(open), []);
  const handleTabChange = useCallback((value: string) => {
    if (isEntityType(value)) setActiveTab(value);
  }, []);

  return (
    <PageWrapper
      title="Validation rules"
      subtitle="What a record has to carry before it can be saved."
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenNew}
          >
            New rule
          </AnimatedIconButton>
        ) : undefined
      }
    >
      {!canView ? (
        <NoPermissionState
          permission="crm:settings:view"
          className={CONTENT_FILL_PANEL}
          description="CRM configuration is managed by your sales operations team."
        />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mb-3 shrink-0">
            {ENTITY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {ENTITY_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className={TABS_CONTENT_PAGE_BODY_CLASS}>
              <ValidationRuleList entityType={tab.value} canManage={canManage} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {sheetOpen ? (
        <ValidationRuleSheet
          open={sheetOpen}
          onOpenChange={handleSheetOpenChange}
          entityType={activeTab}
          rule={null}
          sortOrder={rules?.length ?? 0}
        />
      ) : null}
    </PageWrapper>
  );
}
