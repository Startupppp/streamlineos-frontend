"use client";

import { useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { apiClient, getApiError } from "@/lib/api-client";

type Props = { params: Promise<{ orgSlug: string; jobId: string }> };

export default function ApplyPage({ params }: Props) {
  const { orgSlug, jobId } = use(params);
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingToken, setTrackingToken] = useState("");

  const handlePhoneChange = useCallback((value: string) => {
    setPhone(value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { toast.error("Full name is required"); return; }
    if (!email.trim()) { toast.error("Email is required"); return; }

    setSubmitting(true);
    try {
      const data = await apiClient.post<{ trackingToken: string }>(
        `/public/careers/${orgSlug}/jobs/${jobId}/apply`,
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          coverLetter: coverLetter.trim() || undefined,
          resumeUrl: resumeUrl.trim() || undefined,
        },
      );
      setTrackingToken(data.trackingToken);
      setSubmitted(true);
    } catch (e) {
      toast.error(getApiError(e) || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }, [name, email, phone, linkedinUrl, coverLetter, resumeUrl, orgSlug, jobId]);

  if (submitted) {
    return (
      <main className="min-h-dvh bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-3">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <CardTitle>Application Submitted!</CardTitle>
            <CardDescription>
              Your application has been received. Use your tracking link to check the status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Tracking Link</p>
              <a
                href={`/application-status/${trackingToken}`}
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {typeof window !== "undefined" ? `${window.location.origin}/application-status/${trackingToken}` : `/application-status/${trackingToken}`}
              </a>
              <p className="text-xs text-muted-foreground mt-1.5">Save this link to track your application status.</p>
            </div>
            <Button
              className="w-full"
              onClick={() => router.push(`/application-status/${trackingToken}`)}
            >
              Track My Application
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push(`/careers/${orgSlug}`)}>
              View Other Openings
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background">
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={`/careers/${orgSlug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to all openings
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Apply for this position</CardTitle>
            <CardDescription>Fill in your details to submit your application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <PhoneInput
                value={phone}
                onChange={handlePhoneChange}
                defaultCountry="IN"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/yourname"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resume">Resume URL</Label>
              <Input
                id="resume"
                type="url"
                placeholder="https://drive.google.com/... or portfolio link"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cover">Cover Letter</Label>
              <Textarea
                id="cover"
                placeholder="Tell us why you're a great fit for this role..."
                rows={5}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Application"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
