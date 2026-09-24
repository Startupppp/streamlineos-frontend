import type { EnrollmentStatus } from "@/hooks/api/hr/recruitment/email-sequences-schema";
export type JobPostingStatus = "DRAFT" | "OPEN" | "PAUSED" | "CLOSED" | "FILLED";
export type HiringFlowRoundType = "HR_SCREENING" | "TECHNICAL" | "MANAGER" | "CULTURAL_FIT" | "FINAL" | "CUSTOM";
export type HiringFlowRoundMode = "VIDEO" | "PHONE" | "ONSITE";

export interface HiringFlowRound {
  id: number;
  flowId: number;
  orgId: string;
  name: string;
  roundType: HiringFlowRoundType;
  mode: HiringFlowRoundMode;
  durationMinutes: number;
  slaDays: number | null;
  questionBankTag: string | null;
  scorecardTemplateId: number | null;
  interviewerRoleRestriction: string | null;
  autoAdvanceThreshold: number | null;
  orderIndex: number;
  createdAt: Date | string | null;
}

export interface HiringFlow {
  id: number;
  orgId: string;
  name: string;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  rounds?: HiringFlowRound[];
}

export interface CreateHiringFlowInput {
  name: string;
  isDefault?: boolean;
}

export interface UpdateHiringFlowInput {
  name?: string;
  isDefault?: boolean;
}

export interface CreateHiringFlowRoundInput {
  name: string;
  roundType: HiringFlowRoundType;
  mode: HiringFlowRoundMode;
  durationMinutes?: number;
  slaDays?: number;
  questionBankTag?: string;
  scorecardTemplateId?: number;
  interviewerRoleRestriction?: string;
  autoAdvanceThreshold?: number;
  orderIndex?: number;
}

export interface UpdateHiringFlowRoundInput {
  name?: string;
  roundType?: HiringFlowRoundType;
  mode?: HiringFlowRoundMode;
  durationMinutes?: number;
  slaDays?: number | null;
  questionBankTag?: string | null;
  scorecardTemplateId?: number | null;
  interviewerRoleRestriction?: string | null;
  autoAdvanceThreshold?: number | null;
  orderIndex?: number;
}
export type CandidateStatus = "NEW" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";
export type InterviewType = "PHONE" | "VIDEO" | "ONSITE" | "TECHNICAL" | "HR" | "FINAL";
export type InterviewResult = "PENDING" | "PASSED" | "FAILED" | "NO_SHOW";
export type ApplicationStatus = "APPLIED" | "SHORTLISTED" | "INTERVIEWING" | "OFFERED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type BgvStatus = "NOT_INITIATED" | "INITIATED" | "PENDING" | "CLEARED" | "FAILED";
export type SlaCandidateStatus = "ON_TRACK" | "AT_RISK" | "BREACHED";

export type ScreeningQuestionType = "TEXT" | "YES_NO" | "SINGLE_SELECT" | "NUMBER";

export interface ScreeningQuestion {
  id: string;
  question: string;
  type: ScreeningQuestionType;
  required: boolean;
  knockout: boolean;
  knockoutAnswer?: string;
  options?: string[];
}

/**
 * The `job_postings` row as the API sends it. The department column is
 * `orgDepartmentId` on both sides — the old `departmentId` spelling never
 * arrived, so every read of it resolved to `undefined`.
 */
export interface JobPosting {
  id: number;
  orgId: string;
  title: string;
  orgDepartmentId: string | null;
  hiringFlowId: number | null;
  location: string | null;
  type: string;
  experience: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  status: JobPostingStatus;
  openings: number;
  applicationDeadline: string | null;
  closingDate: string | null;
  postedBy: string | null;
  postedByMembershipId: number | null;
  externalPostingIds: Record<string, string> | null;
  isInternal: boolean;
  screeningQuestions: ScreeningQuestion[] | null;
  createdAt: string;
  updatedAt: string;
  _count?: { applications?: number };
}

export interface Candidate {
  id: number;
  orgId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  currentCompany: string | null;
  currentRole: string | null;
  experienceYears: string | null;
  skills: string[] | null;
  source: string | null;
  sourceUrl: string | null;
  location: string | null;
  status: CandidateStatus | null;
  notes: string | null;
  rating: number | null;
  aiScore: number | null;
  aiScoreBreakdown: Record<string, number> | null;
  aiScoreGeneratedAt: Date | string | null;
  bgvStatus: BgvStatus | null;
  bgvAgency: string | null;
  bgvNotes: string | null;
  bgvInitiatedAt: Date | string | null;
  bgvCompletedAt: Date | string | null;
  externalId: string | null;
  duplicateOfId: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  interviews?: Interview[];
}

export interface CandidateApplication {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number;
  status: ApplicationStatus | null;
  appliedAt: Date | string | null;
  coverLetter: string | null;
  notes: string | null;
  candidate?: Candidate;
  jobPosting?: JobPosting | null;
}

export interface AtsPipelineCandidate {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  source: string | null;
  rating: number | null;
  jobTitle: string | null;
  applicationId: number | null;
  appliedAt: Date | string | null;
  slaStatus: SlaCandidateStatus | null;
  resumeUrl: string | null;
  notes: string | null;
}

export interface AtsPipelineStage {
  stage: CandidateStatus;
  total: number;
  /** How many of `total` this response carries — the endpoint caps each stage. */
  shown: number;
  truncated: boolean;
  candidates: AtsPipelineCandidate[];
}

export interface AtsPipelineResponse {
  stages: AtsPipelineStage[];
}

export interface InterviewRubricEntry {
  category: string;
  score: number;
  maxScore: number;
  comment?: string;
}

export interface Interview {
  id: number;
  orgId: string;
  candidateId: number;
  jobPostingId: number | null;
  interviewerId: string | null;
  type: InterviewType | null;
  scheduledAt: Date | string;
  duration: number | null;
  location: string | null;
  meetingLink: string | null;
  result: InterviewResult | null;
  feedback: string | null;
  rating: number | null;
  rubric: InterviewRubricEntry[] | null;
  notes: string | null;
  recordingUrl?: string | null;
  recordingPlatform?: string | null;
  panelInterviewerIds?: string[] | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  candidate?: Candidate;
  interviewer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

export interface RecruitmentStats {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  newCandidates: number;
  upcomingInterviews: number;
  hiredThisMonth: number;
  funnel: Record<string, number>;
  sources: { source: string; count: number }[];
  avgTimeToHireDays: number;
}

export interface CreateJobPostingInput {
  title: string;
  departmentId?: string;
  hiringFlowId?: number;
  location?: string;
  type?: string;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  requirements?: string;
  benefits?: string;
  openings?: number;
  applicationDeadline?: string;
  status?: JobPostingStatus;
  screeningQuestions?: ScreeningQuestion[];
}

export interface UpdateJobPostingInput {
  title?: string;
  departmentId?: string;
  hiringFlowId?: number | null;
  location?: string;
  type?: string;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  requirements?: string;
  benefits?: string;
  status?: JobPostingStatus;
  openings?: number;
  applicationDeadline?: string;
  screeningQuestions?: ScreeningQuestion[];
}

export interface CreateCandidateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  currentRole?: string;
  experienceYears?: number;
  skills?: string[];
  source?: string;
  notes?: string;
}

export interface UpdateCandidateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  currentRole?: string;
  currentCompany?: string;
  experienceYears?: number;
  linkedinUrl?: string;
  source?: string;
  skills?: string[];
  status?: CandidateStatus;
  notes?: string;
  rating?: number;
}

export interface CreateInterviewInput {
  candidateId: number;
  jobPostingId?: number;
  interviewerId?: string;
  type?: InterviewType;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  notes?: string;
}

export interface UpdateInterviewInput {
  type?: InterviewType;
  scheduledAt?: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  result?: InterviewResult;
  feedback?: string;
  rating?: number;
  rubric?: InterviewRubricEntry[];
  notes?: string;
  recordingUrl?: string | null;
  recordingPlatform?: string | null;
}

export type ReferralStatus = "SUBMITTED" | "REVIEWING" | "HIRED" | "REJECTED" | "BONUS_PAID";

export interface CandidateReferral {
  id: number;
  orgId: string;
  candidateId: number;
  referredBy: string;
  jobPostingId: number | null;
  relationship: string | null;
  notes: string | null;
  status: ReferralStatus;
  bonusEligible: boolean;
  bonusAmount: string | null;
  bonusPaidAt: string | null;
  createdAt: string;
  updatedAt: string;
  candidate?: { id: number; firstName: string; lastName: string; email: string } | null;
  referrer?: { id: string; name: string | null; email: string | null } | null;
  jobPosting?: { id: number; title: string } | null;
}

export interface CreateReferralInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobPostingId?: number;
  relationship?: string;
  notes?: string;
}

export type EmailSequenceTrigger = "MANUAL" | "CANDIDATE_ADDED" | "APPLICATION_RECEIVED" | "STAGE_CHANGED" | "OFFER_SENT";
/**
 * Derived from the contract rather than restated, so this type cannot fall
 * behind the parser the way it did: it listed four values while the backend had
 * been writing a fifth, `HELD_NO_CONSENT`, and the enum threw on parse.
 */
export type EmailSequenceEnrollmentStatus = EnrollmentStatus;

export interface EmailSequenceStep {
  id: number;
  sequenceId: number;
  stepOrder: number;
  delayDays: number;
  subject: string;
  htmlBody: string;
  createdAt: string;
}

export interface EmailSequenceEnrollment {
  id: number;
  sequenceId: number;
  candidateId: number;
  currentStep: number;
  status: EmailSequenceEnrollmentStatus;
  enrolledAt: string;
  nextSendAt: string | null;
  completedAt: string | null;
}

export interface EmailSequence {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: EmailSequenceTrigger;
  targetAudience: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  steps?: EmailSequenceStep[];
  enrollments?: Pick<EmailSequenceEnrollment, "id" | "status">[];
  creator?: { id: string; name: string | null };
}

export interface CreateEmailSequenceInput {
  name: string;
  description?: string;
  isActive?: boolean;
  triggerType?: EmailSequenceTrigger;
  targetAudience?: Record<string, unknown>;
  steps?: Omit<EmailSequenceStep, "id" | "sequenceId" | "createdAt">[];
}

export interface UpdateEmailSequenceInput extends Partial<CreateEmailSequenceInput> {
  steps?: Omit<EmailSequenceStep, "id" | "sequenceId" | "createdAt">[];
}
