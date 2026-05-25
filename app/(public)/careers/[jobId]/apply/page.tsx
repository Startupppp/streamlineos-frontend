"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { CheckCircle2 } from "lucide-react";
import { CareersHeader } from "@/features/careers/careers-header";
import { CareersFooter } from "@/features/careers/careers-footer";

interface FormState {
  name: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  coverLetter: string;
  resumeUrl: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  coverLetter: "",
  resumeUrl: "",
};

export default function ApplyPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = Number(params.jobId);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/api/careers/apply", {
        jobPostingId: jobId,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        coverLetter: form.coverLetter.trim() || undefined,
        resumeUrl: form.resumeUrl.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col noir-mesh">
      <CareersHeader
        backHref={`/careers/${jobId}`}
        backLabel="Back to job"
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        {submitted ? (
          <div className="text-center py-16 rounded-2xl border bg-card/80 shadow-soft px-6">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Application submitted</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Thank you for your interest. We&apos;ll review your application and get in touch if
              there&apos;s a match.
            </p>
            <Link
              href="/careers"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Browse other openings
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card/90 p-6 sm:p-8 shadow-soft">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight">Apply for this position</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Fill out the form below and we&apos;ll get back to you soon.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-sm font-medium">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={set("name")}
                  required
                  placeholder="John Doe"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  required
                  placeholder="you@example.com"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-sm font-medium">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+91 98765 43210"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="linkedinUrl" className="block text-sm font-medium">
                  LinkedIn Profile URL
                </label>
                <input
                  id="linkedinUrl"
                  type="url"
                  value={form.linkedinUrl}
                  onChange={set("linkedinUrl")}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="resumeUrl" className="block text-sm font-medium">
                  Resume URL
                </label>
                <input
                  id="resumeUrl"
                  type="url"
                  value={form.resumeUrl}
                  onChange={set("resumeUrl")}
                  placeholder="https://drive.google.com/..."
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="coverLetter" className="block text-sm font-medium">
                  Cover Letter
                </label>
                <textarea
                  id="coverLetter"
                  value={form.coverLetter}
                  onChange={set("coverLetter")}
                  rows={5}
                  placeholder="Tell us why you'd be a great fit..."
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="press-scale w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-gold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit application"}
              </button>
            </form>
          </div>
        )}
      </main>

      <CareersFooter />
    </div>
  );
}
