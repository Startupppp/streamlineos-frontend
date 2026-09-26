import { z } from "zod";

/**
 * The candidate's own view of their application.
 *
 * Six coarse statuses rather than the pipeline's seven. The endpoint's token
 * travels in a URL — into mail archives, browser history and referrer headers —
 * so the response carries a first name and nothing else that identifies anyone.
 */
export const publicApplicationStatusContract = z.object({
  status: z.enum(["received", "in_review", "interview", "offer", "hired", "rejected"]),
  statusText: z.string(),
  appliedAt: z.string().nullable(),
  updatedAt: z.string(),
  jobTitle: z.string(),
  jobLocation: z.string().nullable(),
  jobType: z.string().nullable(),
  organisationName: z.string(),
  candidateFirstName: z.string(),
  /** A live self-schedule link, when there is one to act on. */
  bookingUrl: z.string().nullable(),
  /** A live offer awaiting an answer, when there is one. */
  offerUrl: z.string().nullable(),
});

export const publicJobListContract = z.object({
  org: z.object({
    id: z.string(),
    name: z.string().nullable(),
    logo: z.string().nullable(),
    industry: z.string().nullable(),
  }),
  jobs: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      location: z.string().nullable(),
      type: z.string().nullable(),
      experience: z.string().nullable(),
      salaryMin: z.string().nullable(),
      salaryMax: z.string().nullable(),
      openings: z.number().int(),
      applicationDeadline: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

/**
 * The screening questions a careers form has to render. `knockoutAnswer` is
 * deliberately absent from the payload — publishing the passing answer would
 * tell every applicant what to say.
 */
export const publicScreeningQuestionContract = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["TEXT", "YES_NO", "SINGLE_SELECT", "NUMBER"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

export const publicJobDetailContract = z.object({
  org: z.object({
    id: z.string(),
    name: z.string().nullable(),
    logo: z.string().nullable(),
  }),
  job: z.object({
    id: z.number().int(),
    title: z.string(),
    location: z.string().nullable(),
    type: z.string().nullable(),
    experience: z.string().nullable(),
    salaryMin: z.string().nullable(),
    salaryMax: z.string().nullable(),
    openings: z.number().int(),
    applicationDeadline: z.string().nullable(),
    createdAt: z.string(),
    description: z.string().nullable(),
    requirements: z.string().nullable(),
    benefits: z.string().nullable(),
    closingDate: z.string().nullable(),
    screeningQuestions: z.array(publicScreeningQuestionContract).nullable(),
  }),
});

export const publicJobApplicationContract = z.object({
  trackingToken: z.string(),
  /** True when this email had already applied; the token is the first one's. */
  duplicate: z.boolean(),
  resumeStored: z.boolean(),
  resumeReason: z.string().nullable(),
});

/**
 * The compensation breakdown, already summed and already divided into months by
 * the backend. `monthly` is null on a line that has no monthly form — a joining
 * bonus is paid once, and a per-month figure against it would state a recurring
 * payment nobody offered.
 */
const publicCtcPreview = z.object({
  lines: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      recurrence: z.enum(["MONTHLY", "LUMP_SUM"]),
      annual: z.string(),
      monthly: z.string().nullable(),
    }),
  ),
  annualTotal: z.string().nullable(),
  monthlyTotal: z.string().nullable(),
  lumpSumTotal: z.string().nullable(),
});

export const publicOfferDetailContract = z.object({
  id: z.number().int(),
  offerStatus: z.string(),
  currency: z.string(),
  offeredSalary: z.string().nullable(),
  offeredDesignation: z.string().nullable(),
  joiningDate: z.string().nullable(),
  validUntil: z.string().nullable(),
  notes: z.string().nullable(),
  /** Null when no breakdown was entered, or when it disagrees with the salary. */
  ctcPreview: publicCtcPreview.nullable(),
  negotiations: z.array(z.record(z.string(), z.unknown())),
});

export const publicOfferRespondContract = z.object({
  success: z.boolean(),
  status: z.string(),
});

export const publicReferrerRegisterContract = z.object({
  referralToken: z.string(),
  name: z.string().nullable(),
  orgName: z.string(),
});

export const publicReferrerPortalContract = z.object({
  referrerName: z.string().nullable(),
  orgName: z.string(),
  currency: z.string(),
  openJobs: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      location: z.string().nullable(),
    }),
  ),
  referrals: z.array(
    z.object({
      id: z.number().int(),
      candidateName: z.string(),
      jobTitle: z.string().nullable(),
      status: z.string(),
      rewardAmount: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

export const publicReferralSubmitContract = z.discriminatedUnion(
  "alreadyReferred",
  [
    z.object({ alreadyReferred: z.literal(true) }),
    z.object({
      alreadyReferred: z.literal(false),
      referral: z.record(z.string(), z.unknown()),
    }),
  ],
);

export const publicVendorPortalContract = z.object({
  vendorName: z.string().nullable(),
  submissions: z.array(
    z.object({
      id: z.number().int(),
      candidateName: z.string(),
      jobTitle: z.string().nullable(),
      placementStatus: z.string(),
      submittedAt: z.string(),
    }),
  ),
});

export const publicOrgNameContract = z.object({ name: z.string(), logo: z.string().nullable() });

export const publicKbListContract = z.object({
  categories: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      slug: z.string(),
    }),
  ),
  articles: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      slug: z.string(),
      excerpt: z.string().nullable(),
      publishedAt: z.string().nullable(),
    }),
  ),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const publicKbArticleContract = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  content: z.string().nullable(),
  excerpt: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  categoryName: z.string().nullable(),
  tags: z.array(z.string()),
  views: z.number().int(),
  publishedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const publicKbFeedbackContract = z.object({
  success: z.boolean(),
  recorded: z.boolean(),
});
