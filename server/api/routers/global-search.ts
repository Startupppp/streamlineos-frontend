import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { leads, deals, contacts } from "@/lib/db/schema/crm";
import { projects, tickets } from "@/lib/db/schema/projects";
import { users, organizationMembers } from "@/lib/db/schema/auth";

const PER_TYPE = 4;

export const globalSearchRouter = createTRPCRouter({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const { query } = input;
      const orgId = ctx.session.orgId;
      const q = `%${query}%`;

      const [leadRows, dealRows, contactRows, ticketRows, employeeRows, projectRows] =
        await Promise.all([
          ctx.db
            .select({ id: leads.id, name: leads.name, email: leads.email, company: leads.company, status: leads.status })
            .from(leads)
            .where(and(eq(leads.orgId, orgId), or(ilike(leads.name, q), ilike(leads.email, q), ilike(leads.company, q))))
            .orderBy(desc(leads.createdAt))
            .limit(PER_TYPE),

          ctx.db
            .select({ id: deals.id, name: deals.name, stage: deals.stage, value: deals.value, contactPerson: deals.contactPerson })
            .from(deals)
            .where(and(eq(deals.orgId, orgId), or(ilike(deals.name, q), ilike(deals.contactPerson, q))))
            .orderBy(desc(deals.createdAt))
            .limit(PER_TYPE),

          ctx.db
            .select({ id: contacts.id, name: contacts.name, email: contacts.email, phone: contacts.phone, company: contacts.company })
            .from(contacts)
            .where(and(eq(contacts.orgId, orgId), or(ilike(contacts.name, q), ilike(contacts.email, q), ilike(contacts.company, q))))
            .orderBy(desc(contacts.createdAt))
            .limit(PER_TYPE),

          ctx.db
            .select({ id: tickets.id, title: tickets.title, status: tickets.status, priority: tickets.priority, ticketNumber: tickets.ticketNumber, projectId: tickets.projectId })
            .from(tickets)
            .where(and(eq(tickets.orgId, orgId), ilike(tickets.title, q)))
            .orderBy(desc(tickets.id))
            .limit(PER_TYPE),

          // Employees: join organizationMembers to scope by org
          ctx.db
            .select({ id: users.id, name: users.name, email: users.email, role: users.role, designation: users.designation, image: users.image })
            .from(users)
            .innerJoin(organizationMembers, and(eq(organizationMembers.userId, users.id), eq(organizationMembers.orgId, orgId)))
            .where(or(ilike(users.name, q), ilike(users.email, q), ilike(users.designation, q)))
            .limit(PER_TYPE),

          ctx.db
            .select({ id: projects.id, name: projects.name, status: projects.status, key: projects.key })
            .from(projects)
            .where(and(eq(projects.orgId, orgId), or(ilike(projects.name, q), ilike(projects.key, q))))
            .limit(PER_TYPE),
        ]);

      return { leads: leadRows, deals: dealRows, contacts: contactRows, tickets: ticketRows, employees: employeeRows, projects: projectRows };
    }),
});
