import type { Metadata } from "next";
import { PublicShell, PublicEyebrow } from "@/features/landing/public-shell";
import { ClaimForm } from "@/features/landing/claim-form";
import { BRAND_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Set up your workspace — ${BRAND_NAME}`,
  // A page reachable only with a token has nothing to gain from being indexed,
  // and something to lose: a crawled URL is a leaked invitation.
  robots: { index: false, follow: false },
};

/**
 * Where an invitation becomes a workspace.
 *
 * Phase 3, ticket 13. The waitlist has collected entries since 25 August with no
 * path out of it — nobody could be let in. This is that path, and it is
 * deliberately not a reopening of self-serve signup: reaching this page requires
 * a single-use token that only a platform operator can mint.
 *
 * The token is in the URL rather than a query string so it is not logged by
 * referrers on outbound links, and the page is `noindex` because a crawled
 * invitation is a spent one.
 */
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ claimToken: string }>;
}) {
  const { claimToken } = await params;

  return (
    <PublicShell>
      <section className="container mx-auto max-w-lg px-4 py-16 lg:px-8 lg:py-24">
        <div className="mb-8 text-center">
          <PublicEyebrow>You&rsquo;re in</PublicEyebrow>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
            Set up your workspace
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A couple of details and {BRAND_NAME} is ready for your team.
          </p>
        </div>

        <ClaimForm token={claimToken} />
      </section>
    </PublicShell>
  );
}
