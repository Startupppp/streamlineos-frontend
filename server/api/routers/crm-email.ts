import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { leadActivities, crmEmailTemplates } from "@/lib/db/schema";
import { sendSmtpEmail, interpolateTemplate } from "@/lib/email/smtp";
import { TRPCError } from "@trpc/server";

export const crmEmailRouter = createTRPCRouter({
  send: protectedProcedure
    .input(z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
      leadId: z.number().optional(),
      clientAccountId: z.number().optional(),
      templateId: z.number().optional(),
      variables: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let subject = input.subject;
      let body = input.body;

      // Interpolate variables
      if (input.variables) {
        subject = interpolateTemplate(subject, input.variables);
        body = interpolateTemplate(body, input.variables);
      }

      const sent = await sendSmtpEmail({
        to: input.to,
        subject,
        html: body,
      });

      if (!sent) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send email. Check SMTP configuration." });
      }

      // Log as activity if leadId provided
      if (input.leadId) {
        await ctx.db.insert(leadActivities).values({
          orgId: ctx.session.orgId,
          leadId: input.leadId,
          type: "email",
          date: new Date(),
          subject: input.subject,
          notes: `Email sent to ${input.to}`,
          userId: ctx.session.userId,
        });
      }

      return { success: true, sentAt: new Date() };
    }),

  getTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.query.crmEmailTemplates.findMany({
        where: eq(crmEmailTemplates.orgId, ctx.session.orgId),
      });
    }),
});
