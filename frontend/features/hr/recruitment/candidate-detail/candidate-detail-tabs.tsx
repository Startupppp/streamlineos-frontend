"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Briefcase, Calendar, FileText, ShieldCheck, ClipboardCheck,
  FileSignature, Users, MessageSquare, History, Share2,
} from "lucide-react";
import { DocumentsTab } from "@/features/hr/recruitment/candidate-detail/documents-tab";
import { VaultTab } from "@/features/hr/recruitment/candidate-detail/vault-tab";
import { ReferenceChecksTab } from "@/features/hr/recruitment/candidate-detail/reference-checks-tab";
import { OffersTab } from "@/features/hr/recruitment/candidate-detail/offers-tab";
import { CalibrationTab } from "@/features/hr/recruitment/candidate-detail/calibration-tab";
import { ResumeTab } from "@/features/hr/recruitment/candidate-detail/resume-tab";
import { ReferralsTab } from "@/features/hr/recruitment/candidate-detail/referrals-tab";
import { ActivityTab } from "@/features/hr/recruitment/candidate-detail/activity-tab";
import { ApplicationsTab } from "@/features/hr/recruitment/candidates/applications-tab";
import { InterviewsTab } from "@/features/hr/recruitment/candidates/interviews-tab";
import { MessagesTab } from "@/features/hr/recruitment/candidates/messages-tab";
import type { CandidateStatus, BgvStatus, CandidateApplication, Interview } from "@/types/hr";
import type { InterviewScorecard } from "@/hooks/api/hr/recruitment";
import type { ScorecardTemplate } from "@/hooks/api/hr/recruitment";

interface CandidateDetailTabsProps {
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  candidateStatus: CandidateStatus | null;
  currentRole: string | null;
  resumeUrl: string | null;
  bgvStatus: BgvStatus | null;
  bgvAgency: string | null;
  bgvNotes: string | null;
  bgvInitiatedAt: string | null;
  bgvCompletedAt: string | null;
  applications?: CandidateApplication[] | null;
  interviews?: (Interview & { scorecards?: InterviewScorecard[] })[] | null;
  expandedScorecardId: number | null;
  defaultTemplate: ScorecardTemplate | null;
  onToggleScorecard: (interviewId: number) => void;
  onApplyOpen: () => void;
  onScheduleOpen: () => void;
}

export function CandidateDetailTabs({
  candidateId,
  candidateName,
  candidateEmail,
  candidateStatus,
  currentRole,
  resumeUrl,
  bgvStatus,
  bgvAgency,
  bgvNotes,
  bgvInitiatedAt,
  bgvCompletedAt,
  applications,
  interviews,
  expandedScorecardId,
  defaultTemplate,
  onToggleScorecard,
  onApplyOpen,
  onScheduleOpen,
}: CandidateDetailTabsProps) {
  return (
    <div className="lg:col-span-2">
      <Tabs defaultValue="applications">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="applications">
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="resume">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Resume
          </TabsTrigger>
          <TabsTrigger value="interviews">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Interviews
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="referrals">
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Referrals
          </TabsTrigger>
          <TabsTrigger value="offers">
            <FileSignature className="h-3.5 w-3.5 mr-1.5" />
            Offers
          </TabsTrigger>
          <TabsTrigger value="vault">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
            Verification
          </TabsTrigger>
          <TabsTrigger value="references">
            <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
            References
          </TabsTrigger>
          <TabsTrigger value="calibration">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Calibration
          </TabsTrigger>
          <TabsTrigger value="activity">
            <History className="h-3.5 w-3.5 mr-1.5" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <ApplicationsTab
            applications={applications}
            onApplyOpen={onApplyOpen}
          />
        </TabsContent>

        <TabsContent value="resume">
          <ResumeTab resumeUrl={resumeUrl} />
        </TabsContent>

        <TabsContent value="interviews">
          <InterviewsTab
            interviews={interviews}
            expandedScorecardId={expandedScorecardId}
            defaultTemplate={defaultTemplate}
            onToggleScorecard={onToggleScorecard}
            onScheduleOpen={onScheduleOpen}
          />
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Offer Documents</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <DocumentsTab
                candidateId={candidateId}
                candidateName={candidateName}
                jobTitle={currentRole ?? undefined}
                candidateStatus={candidateStatus}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vault">
          <VaultTab
            candidateId={candidateId}
            bgvStatus={bgvStatus}
            bgvAgency={bgvAgency}
            bgvNotes={bgvNotes}
            bgvInitiatedAt={bgvInitiatedAt}
            bgvCompletedAt={bgvCompletedAt}
          />
        </TabsContent>

        <TabsContent value="references">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Reference Checks</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ReferenceChecksTab candidateId={candidateId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Offer Tracking</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <OffersTab candidateId={candidateId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calibration">
          <CalibrationTab candidateId={candidateId} />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesTab candidateId={candidateId} candidateEmail={candidateEmail} />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralsTab candidateId={candidateId} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab candidateId={candidateId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
