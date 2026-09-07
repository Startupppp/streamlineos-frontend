import { z } from "zod";

export const publicApplicationStatusContract = z.object({
  status: z.string(),
  appliedAt: z.string().nullable(),
  updatedAt: z.string(),
  job: z
    .object({
      title: z.string().nullable(),
      location: z.string().nullable(),
      type: z.string().nullable(),
    })
    .nullable(),
  candidate: z
    .object({
      firstName: z.string(),
      lastName: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
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

export const publicJobApplicationContract = z.object({
  trackingToken: z.string(),
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

export const publicReferralSubmitContract = z.discriminatedUnion("alreadyReferred", [
  z.object({ alreadyReferred: z.literal(true) }),
  z.object({
    alreadyReferred: z.literal(false),
    referral: z.record(z.string(), z.unknown()),
  }),
]);

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

export const publicOrgNameContract = z.object({ name: z.string() });

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
});

export const publicKbFeedbackContract = z.object({
  success: z.boolean(),
  recorded: z.boolean(),
});
