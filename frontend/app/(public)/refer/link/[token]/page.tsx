"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiClient, getApiError } from "@/lib/api-client";
import { format } from "date-fns";
import { Share2 } from "lucide-react";

type Props = { params: Promise<{ token: string }> };

interface OpenJob {
  id: number;
  title: string;
  location: string | null;
}

interface ReferralRow {
  id: number;
  candidateName: string;
  jobTitle: string | null;
  status: string;
  rewardAmount: string | null;
  createdAt: string;
}

interface PortalData {
  referrerName: string;
  orgName: string;
  openJobs: OpenJob[];
  referrals: ReferralRow[];
}

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  REVIEWING: "Reviewing",
  HIRED: "Hired",
  REJECTED: "Not Selected",
  INELIGIBLE: "Already In Pipeline",
  REWARD_PENDING: "Reward Pending",
  REWARD_PAID: "Reward Paid",
};

export default function ExternalReferrerPortalPage({ params }: Props) {
  const { token } = use(params);
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobPostingId, setJobPostingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const fetchPortal = useCallback(async () => {
    try {
      const result = await apiClient.get<PortalData>(`/public/referrals/${token}`);
      setData(result);
    } catch (e) {
      setLoadError(getApiError(e) || "Referral link not found.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchPortal(); }, [fetchPortal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setSubmitError("First name, last name, and email are required.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");
    try {
      const result = await apiClient.post<{ alreadyReferred: boolean }>(`/public/referrals/${token}/submit`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        jobPostingId: jobPostingId ? Number(jobPostingId) : undefined,
      });
      setSubmitSuccess(
        result.alreadyReferred
          ? "You've already referred this person — no need to submit again."
          : "Referral submitted! We'll keep you posted on their progress.",
      );
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setJobPostingId("");
      void fetchPortal();
    } catch (e) {
      setSubmitError(getApiError(e) || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFirstNameChange(e: React.ChangeEvent<HTMLInputElement>) { setFirstName(e.target.value); }
  function handleLastNameChange(e: React.ChangeEvent<HTMLInputElement>) { setLastName(e.target.value); }
  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) { setEmail(e.target.value); }
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) { setPhone(e.target.value); }

  if (loading) {
    return (
      <main className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (loadError || !data) {
    return (
      <main className="min-h-dvh bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-10">
            <p className="font-medium">{loadError || "Referral link not found"}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Share2 className="h-5 w-5" />
            </div>
            <CardTitle className="text-center">Welcome, {data.referrerName}</CardTitle>
            <CardDescription className="text-center">Refer candidates for open roles at {data.orgName}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={handleFirstNameChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={handleLastNameChange} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Candidate Email</Label>
                <Input id="email" type="email" value={email} onChange={handleEmailChange} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Candidate Phone (optional)</Label>
                <Input id="phone" value={phone} onChange={handlePhoneChange} />
              </div>
              {data.openJobs.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Role (optional)</Label>
                  <Select value={jobPostingId} onValueChange={setJobPostingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an open role" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.openJobs.map((job) => (
                        <SelectItem key={job.id} value={String(job.id)}>
                          {job.title}{job.location ? ` · ${job.location}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              {submitSuccess && <p className="text-sm text-green-600">{submitSuccess}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting…" : "Refer This Candidate"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {data.referrals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">You haven&apos;t referred anyone yet.</p>
            ) : (
              <div className="space-y-2">
                {data.referrals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.candidateName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.jobTitle ?? "General"} · {format(new Date(r.createdAt), "MMM d, yyyy")}
                        {r.rewardAmount && ` · ₹${parseFloat(r.rewardAmount).toLocaleString()}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{STATUS_LABEL[r.status] ?? r.status}</Badge>
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
