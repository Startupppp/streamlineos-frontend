import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import { QuestionsTab } from "./tabs/questions-tab";
import { OptionsTab } from "./tabs/options-tab";
import { MessagesTab } from "./tabs/messages-tab";
import { ResultsTab } from "./tabs/results-tab";
import { AutomationsTab } from "./tabs/automations-tab";

export function SurveyBuilderTabs({ survey }: { survey: SurveyForm }) {
  return (
    <Tabs defaultValue="questions" className="w-full">
      <TabsList>
        <TabsTrigger value="questions">Questions</TabsTrigger>
        <TabsTrigger value="options">Options</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
        <TabsTrigger value="automations">Automations</TabsTrigger>
      </TabsList>
      <TabsContent value="questions">
        <QuestionsTab survey={survey} />
      </TabsContent>
      <TabsContent value="options">
        <OptionsTab survey={survey} />
      </TabsContent>
      <TabsContent value="messages">
        <MessagesTab survey={survey} />
      </TabsContent>
      <TabsContent value="results">
        <ResultsTab survey={survey} />
      </TabsContent>
      <TabsContent value="automations">
        <AutomationsTab survey={survey} />
      </TabsContent>
    </Tabs>
  );
}
