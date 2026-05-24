"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { CareersBrand } from "../../_components/careers-brand";

interface FormState {
  name: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  coverLetter: string;
  resumeUrl: string;
  resumeName: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  coverLetter: "",
  resumeUrl: "",
  resumeName: "",
};

const RESUME_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const RESUME_MAX_BYTES = 10 * 1024 * 1024;

export default function ApplyPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = Number(params.jobId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);

    if (file.size > RESUME_MAX_BYTES) {
      setError("Resume is too large. Maximum size is 10 MB.");
      return;
    }

    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/careers/upload-resume", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(data.error ?? "Failed to upload resume. Please try again.");
        return;
      }

      setForm((prev) => ({ ...prev, resumeUrl: data.url ?? "", resumeName: file.name }));
    } catch {
      setError("Failed to upload resume. Please try again.");
    } finally {
      setUploadingResume(false);
    }
  };

  const clearResume = () => {
    setForm((prev) => ({ ...prev, resumeUrl: "", resumeName: "" }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    if (uploadingResume) {
      setError("Please wait for the resume upload to finish.");
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <CareersBrand />
          <Link
            href={`/careers/${jobId}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to job
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {submitted ? (
          <div className="text-center py-16">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Thank you for your interest. We&apos;ll review your application and get in touch if
              there&apos;s a match.
            </p>
            <Link
              href="/careers"
              className="mt-6 inline-block text-sm text-primary hover:underline"
            >
              Browse other openings
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight">Apply for this position</h1>
              <p className="mt-1 text-sm text-muted-foreground">
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
                <label className="block text-sm font-medium">Resume</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={RESUME_ACCEPT}
                  onChange={handleResumeChange}
                  className="sr-only"
                  aria-label="Upload resume"
                />
                {form.resumeUrl ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <span className="truncate text-foreground">{form.resumeName || "Resume uploaded"}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingResume}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={clearResume}
                        disabled={uploadingResume}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingResume}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background px-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {uploadingResume ? "Uploading…" : "Click to upload resume (PDF, DOC, DOCX · 10 MB max)"}
                  </button>
                )}
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
                disabled={submitting || uploadingResume}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </>
        )}
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Vaivamm Capital. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
