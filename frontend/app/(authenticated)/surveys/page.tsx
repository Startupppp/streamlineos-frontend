"use client";

import { ClipboardList } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { RequireModule } from "@/components/auth/require-module";

export default function SurveysPage() {
  return (
    <DashboardGate permission="surveys:view">
      <RequireModule module="SURVEYS">
        <PageWrapper
          title="Surveys"
          eyebrow="Surveys"
          subtitle="Build surveys, quizzes, live polls, and lead forms."
        >
          <EmptyState
            illustration={
              <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            }
            title="No Survey Found"
            description="Create a survey, assessment, live session, or lead qualification form to get started."
            action={{ label: "New Survey", href: "/surveys/new" }}
            className="flex-1"
          />
        </PageWrapper>
      </RequireModule>
    </DashboardGate>
  );
}
