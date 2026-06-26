import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewBookingLinks, candidates, jobPostings, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const links = await db.query.interviewBookingLinks.findMany({
      where: eq(interviewBookingLinks.orgId, session.orgId),
      orderBy: [desc(interviewBookingLinks.createdAt)],
      with: {
        candidate: { columns: { id: true, firstName: true, lastName: true, email: true } },
        jobPosting: { columns: { id: true, title: true } },
        creator: { columns: { id: true, name: true } },
      },
    });

    return ok(links);
  });
}
