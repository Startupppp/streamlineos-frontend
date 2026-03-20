import { mergeRouters } from "../../trpc";
import { coreRouter } from "./core";
import { ticketRouter } from "./ticket";
import { sprintRouter } from "./sprint";
import { timesheetRouter } from "./timesheet";
import { customStatesRouter } from "./custom-states";
import { cyclesRouter } from "./cycles";
import { modulesRouter } from "./modules";
import { pagesRouter } from "./pages";
import { intakeRouter } from "./intake";
import { viewsRouter } from "./views";
import { relationsRouter } from "./relations";
import { projectAnalyticsRouter } from "./analytics";

export const projectRouter = mergeRouters(
  coreRouter,
  ticketRouter,
  sprintRouter,
  timesheetRouter,
  customStatesRouter,
  cyclesRouter,
  modulesRouter,
  pagesRouter,
  intakeRouter,
  viewsRouter,
  relationsRouter,
  projectAnalyticsRouter
);
