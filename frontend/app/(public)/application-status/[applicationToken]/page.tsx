import { notFound } from "next/navigation";
import { publicApplicationStatusContract } from "@/lib/public-schema";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { publicGetNoStore, type PublicApplicationStatus } from "@/lib/public-fetch";


type Props = { params: Promise<{ applicationToken: string }> };

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; description: string }> = {
  APPLIED: { label: "Applied", variant: "secondary", description: "Your application has been received and is under review." },
  REVIEWING: { label: "Under Review", variant: "secondary", description: "Our team is reviewing your application." },
  SHORTLISTED: { label: "Shortlisted", variant: "default", description: "Congratulations! You have been shortlisted for further evaluation." },
  INTERVIEW_SCHEDULED: { label: "Interview Scheduled", variant: "default", description: "An interview has been scheduled for you. Check your email for details." },
  INTERVIEWED: { label: "Interviewed", variant: "default", description: "Your interview is complete. We are evaluating and will get back to you soon." },
  OFFER_EXTENDED: { label: "Offer Extended", variant: "default", description: "An offer has been extended. Please check your email." },
  HIRED: { label: "Hired", variant: "default", description: "Welcome aboard! You've been selected." },
  REJECTED: { label: "Not Selected", variant: "destructive", description: "We've decided not to move forward at this time. Thank you for your interest." },
  WITHDRAWN: { label: "Withdrawn", variant: "outline", description: "Your application has been withdrawn." },
};

export default async function ApplicationStatusPage({ params }: Props) {
  const { applicationToken } = await params;
  const data = await publicGetNoStore<PublicApplicationStatus>(`/public/application-status/${applicationToken}`, undefined, publicApplicationStatusContract);
  if (!data) return notFound();

  const config = STATUS_CONFIG[data.status] ?? { label: data.status, variant: "secondary" as const, description: "" };

  return (
    <main className="min-h-dvh bg-background">
      <div className="max-w-xl mx-auto px-4 py-12">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Application Status</CardTitle>
            {data.candidate && (
              <CardDescription>
                {data.candidate.firstName} {data.candidate.lastName} · {data.candidate.email}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {data.job && (
              <div className="rounded-lg border bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Applied For</p>
                <p className="font-medium text-sm">{data.job.title}</p>
                {data.job.location && <p className="text-xs text-muted-foreground">{data.job.location}</p>}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge variant={config.variant} className="text-sm px-3 py-1">{config.label}</Badge>
              </div>
              {config.description && (
                <p className="text-sm text-muted-foreground">{config.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border px-3 py-2.5">
                <p className="text-muted-foreground mb-0.5">Applied On</p>
                <p className="font-medium">{data.appliedAt ? format(new Date(data.appliedAt), "dd MMM yyyy") : "—"}</p>
              </div>
              <div className="rounded-lg border px-3 py-2.5">
                <p className="text-muted-foreground mb-0.5">Last Updated</p>
                <p className="font-medium">{format(new Date(data.updatedAt), "dd MMM yyyy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
