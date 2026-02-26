import { createTRPCRouter } from "./trpc";
import { hrRouter } from "./routers/hr";
import { projectRouter } from "./routers/project";
import { dashboardRouter } from "./routers/dashboard";
import { rbacRouter } from "./routers/rbac";
import { reportsRouter } from "./routers/reports";
import { authRouter } from "./routers/auth";
import { organizationRouter } from "./routers/organization";
import { crmRouter } from "./routers/crm";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  organization: organizationRouter,
  hr: hrRouter,
  project: projectRouter,
  dashboard: dashboardRouter,
  rbac: rbacRouter,
  reports: reportsRouter,
  crm: crmRouter,
});

import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
