/**
 * The response shapes the backend services actually build, verified against
 * their controllers and the Drizzle column types — including the fields the
 * client does not read. A contract that rejects real traffic turns a working
 * screen into an error page, so these are the "accepts" half of the proof.
 */

export const ACCESS = {
  membershipId: 4711,
  scopes: { "hr:employees:view": "all", "crm:deals:view": "team" },
  modules: { hr: true, crm: true, payroll: false },
  isOrgOwner: false,
  canManageOrganizationMembership: true,
  mfa: { enforced: true, satisfied: false },
  version: 12,
};

const ENTITLEMENT_LIMIT = { limit: 25, used: 3 };

export const ENTITLEMENTS = {
  tier: "PAID",
  plan: "PROFESSIONAL",
  seatLimit: 50,
  lockedModules: [],
  features: {
    chatGroupHuddles: true,
    chatVoiceVideo: true,
    kbPublicSharing: false,
    hrFull: true,
  },
  limits: {
    members: ENTITLEMENT_LIMIT,
    projects: ENTITLEMENT_LIMIT,
    kbPages: ENTITLEMENT_LIMIT,
    chatChannels: ENTITLEMENT_LIMIT,
    crmLeads: ENTITLEMENT_LIMIT,
    crmContacts: ENTITLEMENT_LIMIT,
    crmDeals: ENTITLEMENT_LIMIT,
    supportTickets: ENTITLEMENT_LIMIT,
    automations: ENTITLEMENT_LIMIT,
    signEnvelopes: ENTITLEMENT_LIMIT,
    surveys: ENTITLEMENT_LIMIT,
    acctInvoices: { limit: null, used: 140 },
    hrCandidates: ENTITLEMENT_LIMIT,
    hrJobPostings: ENTITLEMENT_LIMIT,
  },
};

export const LEDGER_ROW = {
  id: 91,
  orgId: "org-1",
  userId: "user-1",
  type: "USAGE",
  amount: -1.25,
  balanceAfter: 998.75,
  feature: "summarize",
  model: "claude",
  referenceId: null,
  metadata: null,
  promptTokens: 120,
  completionTokens: 40,
  totalTokens: 160,
  costUsd: "0.004200",
  createdAt: "2026-08-01T10:00:00.000Z",
};

export const WALLET = {
  wallet: {
    id: 4,
    orgId: "org-1",
    balance: 998.75,
    lifetimeGranted: 1000,
    lifetimeConsumed: 1.25,
    autoTopUpEnabled: false,
    autoTopUpPackId: null,
    autoTopUpThreshold: null,
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  recentTransactions: [LEDGER_ROW],
  packs: [
    {
      id: 1,
      name: "Starter pack",
      credits: 1000,
      bonusCredits: 100,
      priceInPaise: 49900,
      isActive: true,
      sortOrder: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

export const USAGE = {
  lifetimeConsumedCredits: 1.25,
  lifetimeConsumedMilli: 1250,
  totals: {
    requests: 3,
    promptTokens: 120,
    completionTokens: 40,
    totalTokens: 160,
    credits: 1.25,
    costUsd: 0.0042,
  },
  byFeature: [
    { feature: "summarize", requests: 3, totalTokens: 160, credits: 1.25, costUsd: 0.0042 },
  ],
  byModel: [
    {
      model: "claude",
      requests: 3,
      promptTokens: 120,
      completionTokens: 40,
      totalTokens: 160,
      credits: 1.25,
      costUsd: 0.0042,
    },
  ],
  daily: [{ date: "2026-08-01", requests: 3, totalTokens: 160, credits: 1.25 }],
};

export const PERSON = {
  organizationPersonId: "op-1",
  organizationId: "org-1",
  userId: "user-1",
  organizationMembershipId: 7,
  accountAccess: { state: "MEMBER" },
  firstName: "Asha",
  lastName: "Rao",
  displayName: null,
  preferredName: null,
  workEmail: "asha@example.test",
  personalEmail: null,
  phone: null,
  whatsappNumber: null,
  avatarUrl: null,
  timezone: "Asia/Kolkata",
  languageCode: "en",
  linkedinUrl: null,
  githubUrl: null,
  bio: null,
  deletedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
