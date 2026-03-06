import { mergeRouters } from "../../trpc";
import { coreRouter } from "./core";
import { ticketRouter } from "./ticket";
import { sprintRouter } from "./sprint";
import { timesheetRouter } from "./timesheet";

export const projectRouter = mergeRouters(
  coreRouter,
  ticketRouter,
  sprintRouter,
  timesheetRouter
);
