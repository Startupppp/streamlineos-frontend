import { createTRPCRouter } from "./trpc";
import { hrRouter } from "./routers/hr";
import { projectRouter } from "./routers/project";
import { dashboardRouter } from "./routers/dashboard";
import { rbacRouter } from "./routers/rbac";
import { reportsRouter } from "./routers/reports";
import { authRouter } from "./routers/auth";
import { organizationRouter } from "./routers/organization";
import { crmRouter } from "./routers/crm";
import { leadsRouter } from "./routers/leads";
import { targetsRouter } from "./routers/targets";
import { rolesRouter } from "./routers/roles";
import { dealsRouter } from "./routers/deals";
import { notificationsRouter } from "./routers/notifications";
import { chatRouter } from "./routers/chat";
import { invoiceRouter } from "./routers/invoice";
import { supportRouter } from "./routers/support";
import { leadDetailsRouter } from "./routers/lead-details";
import { crmEmailTemplatesRouter } from "./routers/crm-email-templates";
import { leadScoringRouter } from "./routers/lead-scoring";
import { leadAssignmentRouter } from "./routers/lead-assignment";
import { crmSlaRouter } from "./routers/crm-sla";
import { contactsRouter } from "./routers/contacts";
import { crmViewsRouter } from "./routers/crm-views";
import { clientAccountsRouter } from "./routers/client-accounts";
import { incentivesRouter } from "./routers/incentives";
import { dmLeadsRouter } from "./routers/dm-leads";
import { dmCampaignsRouter } from "./routers/dm-campaigns";
import { socialMediaRouter } from "./routers/social-media";
import { branchesRouter } from "./routers/branches";
import { crmEmailRouter } from "./routers/crm-email";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  organization: organizationRouter,
  hr: hrRouter,
  project: projectRouter,
  dashboard: dashboardRouter,
  rbac: rbacRouter,
  reports: reportsRouter,
  crm: crmRouter,
  leads: leadsRouter,
  targets: targetsRouter,
  roles: rolesRouter,
  deals: dealsRouter,
  notifications: notificationsRouter,
  chat: chatRouter,
  invoice: invoiceRouter,
  support: supportRouter,
  leadDetails: leadDetailsRouter,
  crmEmailTemplates: crmEmailTemplatesRouter,
  leadScoring: leadScoringRouter,
  leadAssignment: leadAssignmentRouter,
  crmSla: crmSlaRouter,
  contacts: contactsRouter,
  crmViews: crmViewsRouter,
  clientAccounts: clientAccountsRouter,
  incentives: incentivesRouter,
  dmLeads: dmLeadsRouter,
  dmCampaigns: dmCampaignsRouter,
  socialMedia: socialMediaRouter,
  branches: branchesRouter,
  crmEmail: crmEmailRouter,
});

import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
