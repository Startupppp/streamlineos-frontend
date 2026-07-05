"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiClient, getApiError } from "@/lib/api-client";
import { Building2 } from "lucide-react";

type Props = { params: Promise<{ token: string }> };

interface VendorSubmissionRow {
  id: number;
  candidateName: string;
  jobTitle: string | null;
  placementStatus: string;
  submittedAt: string;
}

interface VendorPortalData {
  vendorName: string;
  submissions: VendorSubmissionRow[];
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SUBMITTED: "secondary",
  INTERVIEWING: "default",
  PLACED: "default",
  REJECTED: "destructive",
};

export default function VendorPortalPage({ params }: Props) {
  const { token } = use(params);
  const [data, setData] = useState<VendorPortalData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPortal = useCallback(async () => {
    try {
      const result = await apiClient.get<VendorPortalData>(`/public/vendor-portal/${token}`);
      setData(result);
    } catch (e) {
      setError(getApiError(e) || "Portal link not found.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchPortal(); }, [fetchPortal]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-10">
            <p className="font-medium">{error || "Portal link not found"}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
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
