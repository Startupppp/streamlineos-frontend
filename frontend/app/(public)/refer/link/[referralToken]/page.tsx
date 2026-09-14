import { notFound } from "next/navigation";
import { publicReferrerPortalContract } from "@/lib/public-schema";
import { Card, CardContent } from "@/components/ui/card";
import { publicGetNoStore, type PublicReferrerPortal } from "@/lib/public-fetch";
import { ApiError } from "@/lib/api-envelope";

import { ReferrerPortalIsland } from "@/features/careers/components/referrer-portal-island";

type Props = { params: Promise<{ referralToken: string }> };

function BlockedState() {
  return (
    <main className="min-h-dvh bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-10">
          <svg className="h-10 w-10 mx-auto mb-4 text-destructive opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <p className="font-medium">This referral account is not eligible</p>
          <p className="text-sm text-muted-foreground mt-1">Please contact the organisation for assistance.</p>
        </CardContent>
      </Card>
    </main>
  );
}

export default async function ExternalReferrerPortalPage({ params }: Props) {
  const { referralToken } = await params;

  let data: PublicReferrerPortal | null;
  try {
    data = await publicGetNoStore<PublicReferrerPortal>(`/public/referrals/${referralToken}`, undefined, publicReferrerPortalContract);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return <BlockedState />;
    throw e;
  }

  if (!data) return notFound();

  return (
    <main className="min-h-dvh bg-background">
      <ReferrerPortalIsland data={data} token={referralToken} />
    </main>
  );
}
