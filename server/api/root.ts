import { createTRPCRouter } from "./trpc";
import { hrRouter } from "./routers/hr";
import { projectRouter } from "./routers/project";
import { dashboardRouter } from "./routers/dashboard";
import { rbacRouter } from "./routers/rbac";
import { reportsRouter } from "./routers/reports";

export const appRouter = createTRPCRouter({
  hr: hrRouter,
  project: projectRouter,
  dashboard: dashboardRouter,
  rbac: rbacRouter,
  reports: reportsRouter,
});

import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";

// export type definition of API
export type AppRouter = typeof appRouter;

// Export types for use in components
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
