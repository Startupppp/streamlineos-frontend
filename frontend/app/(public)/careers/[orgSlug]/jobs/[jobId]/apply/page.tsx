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
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";

type Props = { params: Promise<{ orgSlug: string; jobId: string }> };

const publicJobApplicationContract = lazyContract(() =>
  import("@/lib/public-schema").then((m) => m.publicJobApplicationContract),
);

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
    const fullName = name.trim();
    const emailValue = email.trim().toLowerCase();
    if (!fullName) {
      toast.error("Full name is required");
      return;
    }
    if (fullName.length < 2) {
      toast.error("Full name must be at least 2 characters");
      return;
    }
    if (!emailValue) {
      toast.error("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (phone.trim()) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) {
        toast.error("Phone must be 8–15 digits");
        return;
      }
    }
    if (linkedinUrl.trim()) {
      try {
        const raw = linkedinUrl.trim().startsWith("www.")
          ? `https://${linkedinUrl.trim()}`
          : linkedinUrl.trim();
        const parsed = new URL(raw);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          toast.error("LinkedIn URL must be a valid link");
          return;
        }
      } catch {
        toast.error("LinkedIn URL must be a valid link");
        return;
      }
    }
    if (resumeUrl.trim()) {
      try {
        const parsed = new URL(resumeUrl.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          toast.error("Resume URL must be a valid link");
          return;
        }
      } catch {
        toast.error("Resume URL must be a valid link");
        return;
      }
    }

    setSubmitting(true);
    try {
      const linkedinRaw = linkedinUrl.trim() || undefined;
      const data = await apiClient.post<{ trackingToken: string }>(
        `/public/careers/${orgSlug}/jobs/${jobId}/apply`,
        {
          name: fullName,
          email: emailValue,
          phone: phone.trim() || undefined,
          linkedinUrl: linkedinRaw?.startsWith("www.")
            ? `https://${linkedinRaw}`
            : linkedinRaw,
          coverLetter: coverLetter.trim() || undefined,
          resumeUrl: resumeUrl.trim() || undefined,
        },
        undefined,
        publicJobApplicationContract,
      );
      setTrackingToken(data.trackingToken);
      setSubmitted(true);
    } catch (e) {
      const message = getErrorMessage(e) || "Unable to submit application. Try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [name, email, phone, linkedinUrl, coverLetter, resumeUrl, orgSlug, jobId]);

  if (submitted) {
    return (
      <main className="min-h-dvh bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-3">
            <div className="w-14 h-14 rounded-full bg-status-success-surface flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 text-status-success-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                className="text-sm text-status-info-ink hover:underline break-all"
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
