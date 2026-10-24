import type { ReactNode } from "react";
import { BarChart3, ListChecks, MessageSquare, SlidersHorizontal, Zap } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import {
  MobileOnlyLabelTooltip,
  ResponsiveIconLabelText,
} from "@/components/ui/responsive-icon-label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import { QuestionsTab } from "./tabs/questions-tab";
import { OptionsTab } from "./tabs/options-tab";
import { MessagesTab } from "./tabs/messages-tab";
import { ResultsTab } from "./tabs/results-tab";
import { AutomationsTab } from "./tabs/automations-tab";

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0 min-h-0 w-full flex-1 overflow-hidden`;

const BUILDER_TABS = [
  { value: "questions", label: "Questions", icon: ListChecks },
  { value: "options", label: "Options", icon: SlidersHorizontal },
  { value: "messages", label: "Messages", icon: MessageSquare },
  { value: "results", label: "Results", icon: BarChart3 },
  { value: "automations", label: "Automations", icon: Zap },
] as const;

function TabScrollBody({ children }: { children: ReactNode }) {
  return (
    <ScrollArea fill className="min-h-0 flex-1">
      <div className="flex h-full min-h-full min-w-0 flex-1 flex-col pr-3 pb-1">{children}</div>
    </ScrollArea>
  );
}

export function SurveyBuilderTabs({ survey }: { survey: SurveyForm }) {
  return (
    <Tabs defaultValue="questions" className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3">
      <TabsList className="w-full max-w-full shrink-0 md:w-fit">
        {BUILDER_TABS.map(({ value, label, icon: Icon }) => (
          <MobileOnlyLabelTooltip key={value} label={label}>
            <TabsTrigger value={value} aria-label={label} className="px-2 md:px-3">
              <Icon aria-hidden="true" />
              <ResponsiveIconLabelText>{label}</ResponsiveIconLabelText>
            </TabsTrigger>
          </MobileOnlyLabelTooltip>
        ))}
      </TabsList>
      <TabsContent value="questions" className={TAB_PANEL_CLASS}>
        <QuestionsTab survey={survey} />
      </TabsContent>
      <TabsContent value="options" className={TAB_PANEL_CLASS}>
        <TabScrollBody>
          <OptionsTab survey={survey} />
        </TabScrollBody>
      </TabsContent>
      <TabsContent value="messages" className={TAB_PANEL_CLASS}>
        <TabScrollBody>
          <MessagesTab survey={survey} />
        </TabScrollBody>
      </TabsContent>
      <TabsContent value="results" className={TAB_PANEL_CLASS}>
        <ResultsTab survey={survey} />
      </TabsContent>
      <TabsContent value="automations" className={TAB_PANEL_CLASS}>
        <AutomationsTab survey={survey} />
      </TabsContent>
    </Tabs>
  );
}
