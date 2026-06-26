import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ jobId: string }> };

const PLATFORMS = [
  { key: "LINKEDIN", name: "LinkedIn", baseUrl: "https://www.linkedin.com/sharing/share-offsite/?url=" },
  { key: "WHATSAPP", name: "WhatsApp", baseUrl: "https://wa.me/?text=" },
  { key: "TWITTER", name: "Twitter / X", baseUrl: "https://twitter.com/intent/tweet?url=" },
] as const;

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { jobId: id } = await params;
    const jobId = Number(id);
    if (!Number.isFinite(jobId)) return err("Invalid job ID", 400);

    const [job, org] = await Promise.all([
      db.query.jobPostings.findFirst({
        where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
        columns: { id: true, title: true, location: true, type: true },
      }),
      db.query.organizations.findFirst({
        where: eq(organizations.id, session.orgId),
        columns: { slug: true },
      }),
    ]);
    if (!job) return err("Job posting not found", 404);
    if (!org?.slug) return err("Organization not configured", 500);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "https://app.streamlineos.com";

    const baseJobUrl = `${appUrl}/careers/${org.slug}/jobs/${jobId}/apply`;

    const shareLinks = PLATFORMS.map(({ key, name, baseUrl }) => {
      const utmUrl = `${baseJobUrl}?utm_source=${key.toLowerCase()}&utm_medium=social&utm_campaign=job_${jobId}`;
      const encoded = encodeURIComponent(key === "WHATSAPP"
        ? `${job.title} — Apply now: ${utmUrl}`
        : utmUrl
      );
      return { platform: key, name, url: `${baseUrl}${encoded}`, utmUrl };
    });

    return ok({
      jobId,
      title: job.title,
      shareLinks,
      directLink: baseJobUrl,
      careersPageLink: `${appUrl}/careers/${org.slug}`,
    });
  });
}
