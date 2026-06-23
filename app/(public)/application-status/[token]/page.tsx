"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

type Props = { params: Promise<{ token: string }> };

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

interface ApplicationStatus {
  status: string;
  appliedAt: string;
  updatedAt: string;
  job: { title: string; location: string | null; type: string } | null;
  candidate: { firstName: string; lastName: string; email: string } | null;
}

export default function ApplicationStatusPage({ params }: Props) {
  const { token } = use(params);
  const [data, setData] = useState<ApplicationStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/application-status/${token}`);
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Application not found");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to load application status. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchStatus(); }, [fetchStatus]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <svg className="h-8 w-8 mx-auto mb-3 animate-spin opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading…
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-10">
            <svg className="h-10 w-10 mx-auto mb-4 text-destructive opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="font-medium">{error || "Application not found"}</p>
            <p className="text-sm text-muted-foreground mt-1">Please check your tracking link and try again.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const config = STATUS_CONFIG[data.status] ?? { label: data.status, variant: "secondary" as const, description: "" };

  return (
    <main className="min-h-screen bg-background">
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
                <p className="font-medium">{format(new Date(data.appliedAt), "dd MMM yyyy")}</p>
              </div>
              <div className="rounded-lg border px-3 py-2.5">
                <p className="text-muted-foreground mb-0.5">Last Updated</p>
                <p className="font-medium">{format(new Date(data.updatedAt), "dd MMM yyyy")}</p>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={fetchStatus}>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              Refresh Status
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
