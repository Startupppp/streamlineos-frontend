import { createTRPCRouter } from "@/server/api/trpc";
// Import routers (to be created)
import { hrRouter } from "./routers/hr";
import { projectRouter } from "./routers/project";

export const appRouter = createTRPCRouter({
  hr: hrRouter,
  project: projectRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
