"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getErrorMessage } from "@/lib/get-error-message";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import { useCreateSection, useSurveyBuilder } from "@/hooks/api/surveys/builder";
import { QuestionsTab } from "./tabs/questions-tab";
import { OptionsTab } from "./tabs/options-tab";
import { MessagesTab } from "./tabs/messages-tab";
import { ResultsTab } from "./tabs/results-tab";
import { AutomationsTab } from "./tabs/automations-tab";

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-4 min-h-0 w-full flex-1 overflow-hidden`;

interface BuilderTab {
  value: string;
  label: string;
  Panel: ComponentType<{ survey: SurveyForm }>;
  scroll?: boolean;
}

const BUILDER_TABS: readonly BuilderTab[] = [
  { value: "questions", label: "Questions", Panel: QuestionsTab },
  { value: "options", label: "Options", Panel: OptionsTab, scroll: true },
  { value: "messages", label: "Messages", Panel: MessagesTab, scroll: true },
  { value: "results", label: "Results", Panel: ResultsTab },
  { value: "automations", label: "Automations", Panel: AutomationsTab },
];

function TabScrollBody({ children }: { children: ReactNode }) {
  return (
    <ScrollArea fill className="min-h-0 flex-1">
      <div className="flex h-full min-h-full min-w-0 flex-1 flex-col pr-3 pb-1">
        {children}
      </div>
    </ScrollArea>
  );
}

function TabActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="w-full md:w-auto">
      <AnimatedIconButton
        icon={PlusIcon}
        iconSize={14}
        iconClassName="mr-1.5"
        variant="outline"
        size="sm"
        className="h-9 w-full md:w-auto"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
      >
        {label}
      </AnimatedIconButton>
    </div>
  );
}

export function SurveyBuilderTabs({ survey }: { survey: SurveyForm }) {
  const [tab, setTab] = useState("questions");
  const [addingAutomation, setAddingAutomation] = useState(false);
  const { data: builder } = useSurveyBuilder(survey.id);
  const createSection = useCreateSection(survey.id);
  const sectionCount = builder?.sections.length ?? 0;

  useEffect(() => {
    if (tab !== "automations") setAddingAutomation(false);
  }, [tab]);

  async function handleAddSection() {
    try {
      await createSection.mutateAsync({
        title: `Section ${sectionCount + 1}`,
        sortOrder: sectionCount,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const tabActions =
    tab === "questions" ? (
      <TabActionButton
        label="Add section"
        onClick={() => void handleAddSection()}
        disabled={createSection.isPending}
      />
    ) : tab === "automations" ? (
      <TabActionButton
        label="Add automation"
        onClick={() => setAddingAutomation(true)}
        disabled={addingAutomation}
      />
    ) : undefined;

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-0"
    >
      <PageTabsToolbar
        className="shrink-0"
        tabs={
          <TabsList
            className="w-full max-w-full shrink-0 md:w-fit"
            aria-label="Survey builder"
          >
            {BUILDER_TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        }
        actions={tabActions}
      />
      {BUILDER_TABS.map((item) => (
        <TabsContent key={item.value} value={item.value} className={TAB_PANEL_CLASS}>
          {item.value === "automations" ? (
            <AutomationsTab
              survey={survey}
              adding={addingAutomation}
              onAddingChange={setAddingAutomation}
            />
          ) : item.scroll ? (
            <TabScrollBody>
              <item.Panel survey={survey} />
            </TabScrollBody>
          ) : (
            <item.Panel survey={survey} />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
