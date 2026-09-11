import { notFound } from "next/navigation";
import { publicVendorPortalContract } from "@/lib/public-schema";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import { publicGetNoStore, type PublicVendorPortal } from "@/lib/public-fetch";
import { ApiError } from "@/lib/api-envelope";


type Props = { params: Promise<{ token: string }> };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SUBMITTED: "secondary",
  INTERVIEWING: "default",
  PLACED: "default",
  REJECTED: "destructive",
};

function ExpiredState() {
  return (
    <main className="min-h-dvh bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-10">
          <svg className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <p className="font-medium">This portal link has expired</p>
          <p className="text-sm text-muted-foreground mt-1">Ask your recruiting contact to generate a new one.</p>
        </CardContent>
      </Card>
    </main>
  );
}

export default async function VendorPortalPage({ params }: Props) {
  const { token } = await params;

  let data: PublicVendorPortal | null;
  try {
    data = await publicGetNoStore<PublicVendorPortal>(`/public/vendor-portal/${token}`, undefined, publicVendorPortalContract);
  } catch (e) {
    if (e instanceof ApiError && e.status === 410) return <ExpiredState />;
    throw e;
  }

  if (!data) return notFound();

  return (
    <main className="min-h-dvh bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardHeader className="pb-3">
            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <CardTitle className="text-center">{data.vendorName}</CardTitle>
            <CardDescription className="text-center">Your candidate submissions and pipeline status.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {data.submissions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.candidateName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.jobTitle ?? "General"} · Submitted {format(new Date(s.submittedAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[s.placementStatus] ?? "secondary"} className="text-xs shrink-0">
                      {s.placementStatus}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
