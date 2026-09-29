"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  PmPageShell,
  PmSection,
} from "@/components/pm-chrome";
import { useCan } from "@/hooks/api/access";
import { TestCasesTab } from "./test-cases-tab";
import { TestRunsTab } from "./test-runs-tab";

interface QaPageProps {
  projectId: number;
}

export function QaPage({ projectId }: QaPageProps) {
  const canManage = useCan("build:qa:manage");
  const [tab, setTab] = useState<"cases" | "runs">("cases");
  const [caseCreateNonce, setCaseCreateNonce] = useState(0);
  const [runCreateNonce, setRunCreateNonce] = useState(0);

  const handleTabChange = useCallback((value: string) => {
    if (value === "cases" || value === "runs") setTab(value);
  }, []);

  const handleNewCase = useCallback(() => {
    setCaseCreateNonce((n) => n + 1);
  }, []);

  const handleNewRun = useCallback(() => {
    setRunCreateNonce((n) => n + 1);
  }, []);

  return (
    <PageWrapper
      title="QA / Tests"
      subtitle="Test cases, suites, and execution runs"
      actions={
        canManage ? (
          tab === "cases" ? (
            <AnimatedIconButton
              onClick={handleNewCase}
              icon={PlusIcon}
              iconSize={14}
            >
              New Test Case
            </AnimatedIconButton>
          ) : (
            <AnimatedIconButton
              onClick={handleNewRun}
              icon={PlusIcon}
              iconSize={14}
            >
              New Test Run
            </AnimatedIconButton>
          )
        ) : undefined
      }
    >
      <PmPageShell>
        <Tabs value={tab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col gap-3">
          <PmSection index={0}>
            <PageTabsToolbar
              tabsDensity="labeled"
              tabs={
                <TabsList>
                  <TabsTrigger value="cases">Test Cases</TabsTrigger>
                  <TabsTrigger value="runs">Test Runs</TabsTrigger>
                </TabsList>
              }
            />
          </PmSection>

          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
            <TabsContent value="cases" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
              <TestCasesTab projectId={projectId} createNonce={caseCreateNonce} />
            </TabsContent>
            <TabsContent value="runs" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
              <TestRunsTab projectId={projectId} createNonce={runCreateNonce} />
            </TabsContent>
          </PmSection>
        </Tabs>
      </PmPageShell>
    </PageWrapper>
  );
}
