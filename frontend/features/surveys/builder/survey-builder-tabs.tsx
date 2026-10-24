import type { ComponentType, ReactNode } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
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

function BuilderTabPanel({ tab, survey }: { tab: BuilderTab; survey: SurveyForm }) {
  const panel = <tab.Panel survey={survey} />;
  return (
    <TabsContent value={tab.value} className={TAB_PANEL_CLASS}>
      {tab.scroll ? <TabScrollBody>{panel}</TabScrollBody> : panel}
    </TabsContent>
  );
}

export function SurveyBuilderTabs({ survey }: { survey: SurveyForm }) {
  return (
    <Tabs
      defaultValue="questions"
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-0"
    >
      <TabsList
        className="w-full max-w-full shrink-0 md:w-fit"
        aria-label="Survey builder"
      >
        {BUILDER_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {BUILDER_TABS.map((tab) => (
        <BuilderTabPanel key={tab.value} tab={tab} survey={survey} />
      ))}
    </Tabs>
  );
}
