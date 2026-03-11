import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../../trpc";
import {
  sprints,
  timesheets,
} from "../../../../lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { differenceInCalendarDays, addDays } from "date-fns";
import { formatDateOnly } from "../../../../lib/date-utils";
import {
  createSprintInputSchema,
  updateSprintInputSchema,
} from "../../../../lib/validations/project";

export const sprintRouter = createTRPCRouter({
  getSprints: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(sprints.orgId, ctx.session.orgId)];
      if (input.projectId) {
        conditions.push(eq(sprints.projectId, input.projectId));
      }
      return await ctx.db.query.sprints.findMany({
        where: and(...conditions),
        with: {
          tickets: {
            with: {
              assignee: true,
            },
          },
        },
        orderBy: [desc(sprints.startDate)],
      });
    }),

  createSprint: adminProcedure
    .input(createSprintInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [sprint] = await ctx.db
        .insert(sprints)
        .values({
          orgId: ctx.session.orgId,
          projectId: input.projectId,
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
          goal: input.goal,
          status: "PLANNED",
        })
        .returning();
      return sprint;
    }),

  updateSprint: adminProcedure
    .input(updateSprintInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { sprintId, ...updateData } = input;
      await ctx.db
        .update(sprints)
        .set({
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.startDate && { startDate: updateData.startDate }),
          ...(updateData.endDate && { endDate: updateData.endDate }),
          ...(updateData.goal !== undefined && { goal: updateData.goal }),
          ...(updateData.status && { status: updateData.status }),
        })
        .where(
          and(eq(sprints.id, sprintId), eq(sprints.orgId, ctx.session.orgId))
        );
    }),

  getSprintBurndown: protectedProcedure
    .input(z.object({ sprintId: z.number() }))
    .query(async ({ ctx, input }) => {
      const sprint = await ctx.db.query.sprints.findFirst({
        where: and(
          eq(sprints.id, input.sprintId),
          eq(sprints.orgId, ctx.session.orgId)
        ),
        with: {
          tickets: true,
        },
      });

      if (!sprint) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sprint not found" });
      }

      const totalPoints = sprint.tickets.reduce(
        (sum, ticket) => sum + (ticket.points || 0),
        0
      );

      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      const days = differenceInCalendarDays(endDate, startDate) + 1;

      const idealBurndown = Array.from({ length: days }).map((_, i) => {
        const date = addDays(startDate, i);
        const remainingDays = days - i;
        const idealPoints = Math.max(0, (totalPoints / days) * remainingDays);
        return { date, points: idealPoints };
      });

      const allTimeEntries = await ctx.db.query.timesheets.findMany({
        where: and(
          eq(timesheets.orgId, ctx.session.orgId),
          sql`${timesheets.ticketId} IN (SELECT id FROM tickets WHERE sprint_id = ${input.sprintId})`
        ),
        with: {
          ticket: true,
        },
      });

      const completedTickets = sprint.tickets.filter(
        (t) => t.status === "DONE"
      );
      const completedPointsByDate = new Map<string, number>();

      completedTickets.forEach((ticket) => {
        const ticketEntries = allTimeEntries.filter(
          (e) => e.ticketId === ticket.id
        );
        if (ticketEntries.length > 0) {
          const lastEntry = ticketEntries.reduce((latest, entry) => {
            return new Date(entry.date) > new Date(latest.date)
              ? entry
              : latest;
          });
          const dateKey = formatDateOnly(new Date(lastEntry.date));
          const currentPoints = completedPointsByDate.get(dateKey) || 0;
          completedPointsByDate.set(
            dateKey,
            currentPoints + (ticket.points || 0)
          );
        }
      });

      let cumulativePoints = 0;
      const actualBurndownCumulative = idealBurndown.map((ideal) => {
        const dateKey = formatDateOnly(ideal.date);
        const dayPoints = completedPointsByDate.get(dateKey) || 0;
        cumulativePoints += dayPoints;
        return {
          date: ideal.date,
          points: totalPoints - cumulativePoints,
        };
      });

      return {
        sprint,
        totalPoints,
        idealBurndown,
        actualBurndown: actualBurndownCumulative,
      };
    }),
});
