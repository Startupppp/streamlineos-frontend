"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
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
import {
  RuleSheet,
  buildRuleConfig,
  type RuleFormValues,
} from "@/features/crm/settings/validation-rule-sheet";
import { useCan } from "@/hooks/api/access";
import { useCreateValidationRule, useValidationRules } from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
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
 * Each tab's table is generated from `VALIDATION_RULE_LAYOUT`; the create and
 * edit sheet is not, because a rule's config fields depend on the value of its
 * rule type and the vocabulary has no way to say "only when".
 */
export default function ValidationRulesPage() {
  const canManage = useCan("crm:settings:manage");
  const canView = useCan("crm:settings:view");
  const [activeTab, setActiveTab] = useState<CrmValidationEntityType>("lead");
  const [sheetOpen, setSheetOpen] = useState(false);

  const createRule = useCreateValidationRule();
  const { data: rules } = useValidationRules({ entity: activeTab });

  const handleOpenNew = useCallback(() => setSheetOpen(true), []);
  const handleSheetOpenChange = useCallback((open: boolean) => setSheetOpen(open), []);
  const handleTabChange = useCallback((value: string) => {
    if (isEntityType(value)) setActiveTab(value);
  }, []);

  const handleCreate = useCallback(
    (values: RuleFormValues) => {
      createRule.mutate(
        {
          entityType: values.entityType,
          field: values.field,
          ruleType: values.ruleType,
          config: buildRuleConfig(values),
          pipelineId: values.pipelineId ?? null,
          stageKey: values.stageKey ?? null,
          sourceKey: values.sourceKey ?? null,
          errorMessage: values.errorMessage ?? null,
          isActive: values.isActive,
          sortOrder: rules?.length ?? 0,
        },
        {
          onSuccess: () => {
            toast.success("Rule created");
            setSheetOpen(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [createRule, rules?.length],
  );

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
        <RuleSheet
          open={sheetOpen}
          onOpenChange={handleSheetOpenChange}
          editing={null}
          entityType={activeTab}
          rulesCount={rules?.length ?? 0}
          onSubmit={handleCreate}
          isPending={createRule.isPending}
        />
      ) : null}
    </PageWrapper>
  );
}
