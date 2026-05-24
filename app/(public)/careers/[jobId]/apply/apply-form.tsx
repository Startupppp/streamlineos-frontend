"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { isValidPhoneNumber, type Value as PhoneValue } from "react-phone-number-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";

interface FormState {
  name: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  coverLetter: string;
  resumeUrl: string;
  resumeName: string;
  resumeSize: number;
}

interface FieldErrors {
  name?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  coverLetter?: string;
  resume?: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  coverLetter: "",
  resumeUrl: "",
  resumeName: "",
  resumeSize: 0,
};

const RESUME_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const RESUME_MAX_BYTES = 10 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_RE = /^(https?:\/\/)?([\w-]+\.)?linkedin\.com\/.+/i;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fileKindFromName(name: string): "pdf" | "doc" {
  return name.toLowerCase().endsWith(".pdf") ? "pdf" : "doc";
}

export function ApplyForm({ jobId, jobTitle }: { jobId: number; jobTitle: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (form.name.trim().length < 2) next.name = "Please enter your full name.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.phone && !isValidPhoneNumber(form.phone)) {
      next.phone = "Enter a valid phone number for the selected country.";
    }
    if (form.linkedinUrl && !LINKEDIN_RE.test(form.linkedinUrl.trim())) {
      next.linkedinUrl = "Enter a valid LinkedIn profile URL.";
    }
    if (form.coverLetter.length > 5000) {
      next.coverLetter = "Cover letter must be 5000 characters or fewer.";
    }
    return next;
  };

  const uploadFile = async (file: File) => {
    setTopError(null);
    setErrors((prev) => ({ ...prev, resume: undefined }));

    if (file.size === 0) {
      setErrors((prev) => ({ ...prev, resume: "That file is empty." }));
      return;
    }
    if (file.size > RESUME_MAX_BYTES) {
      setErrors((prev) => ({ ...prev, resume: "Resume must be 10 MB or smaller." }));
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".doc") && !lower.endsWith(".docx")) {
      setErrors((prev) => ({ ...prev, resume: "Only PDF, DOC, or DOCX files are allowed." }));
      return;
    }

    setUploadingResume(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/careers/upload-resume", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setErrors((prev) => ({ ...prev, resume: data.error ?? "Failed to upload resume." }));
        return;
      }
      setForm((prev) => ({
        ...prev,
        resumeUrl: data.url ?? "",
        resumeName: file.name,
        resumeSize: file.size,
      }));
    } catch {
      setErrors((prev) => ({ ...prev, resume: "Network error while uploading. Try again." }));
    } finally {
      setUploadingResume(false);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const clearResume = () => {
    setForm((prev) => ({ ...prev, resumeUrl: "", resumeName: "", resumeSize: 0 }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTopError(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTopError("Please fix the highlighted fields and try again.");
      return;
    }
    if (uploadingResume) {
      setTopError("Please wait for the resume to finish uploading.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobPostingId: jobId,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone ? form.phone : undefined,
          linkedinUrl: form.linkedinUrl.trim() || undefined,
          coverLetter: form.coverLetter.trim() || undefined,
          resumeUrl: form.resumeUrl || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setTopError(data.error ?? "Could not submit your application. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setTopError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="px-6 py-12 sm:px-10 sm:py-16 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground mb-2">
          Application received
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Thanks for applying to <span className="font-medium text-foreground">{jobTitle}</span>.
          We&apos;ll review your profile and get back to you by email.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/careers">Browse other openings</Link>
          </Button>
          <Button asChild>
            <Link href="/">Visit Vaivamm</Link>
          </Button>
        </div>
      </div>
    );
  }

  const resumeUploaded = Boolean(form.resumeUrl);
  const resumeKind = resumeUploaded ? fileKindFromName(form.resumeName) : "pdf";

  return (
    <form onSubmit={handleSubmit} className="divide-y divide-border">
      <section className="px-6 py-6 sm:px-8 sm:py-7 space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Your information
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            We&apos;ll use this to contact you about your application.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="John Doe"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              required
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              required
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInput
              id="phone"
              defaultCountry="IN"
              value={form.phone as PhoneValue}
              onChange={(value) => setField("phone", (value ?? "") as string)}
              placeholder="98765 43210"
              aria-invalid={Boolean(errors.phone)}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
            <Input
              id="linkedinUrl"
              type="url"
              value={form.linkedinUrl}
              onChange={(e) => setField("linkedinUrl", e.target.value)}
              placeholder="linkedin.com/in/yourprofile"
              autoComplete="url"
              aria-invalid={Boolean(errors.linkedinUrl)}
            />
            {errors.linkedinUrl && <p className="text-xs text-destructive">{errors.linkedinUrl}</p>}
          </div>
        </div>
      </section>

      <section className="px-6 py-6 sm:px-8 sm:py-7 space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Resume
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            PDF, DOC, or DOCX up to 10 MB.
          </p>
        </div>

        <input
          ref={fileInputRef}
          id="resume-file-input"
          type="file"
          accept={RESUME_ACCEPT}
          onChange={handleFileInput}
          className="sr-only"
          aria-label="Upload resume"
        />

        {resumeUploaded ? (
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3 sm:p-4">
            <div className={`shrink-0 h-11 w-11 rounded-lg flex items-center justify-center ${resumeKind === "pdf" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{form.resumeName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Uploaded
                </span>
                <span aria-hidden>·</span>
                <span>{formatBytes(form.resumeSize)}</span>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1">
              <a
                href={form.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Preview
              </a>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={clearResume}
                aria-label="Remove resume"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor="resume-file-input"
            onDragOver={(e) => {
              e.preventDefault();
              if (!uploadingResume) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 sm:py-10 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-input bg-muted/20 hover:border-primary/60 hover:bg-muted/30"
            } ${uploadingResume ? "pointer-events-none opacity-70" : ""}`}
          >
            <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary/15"}`}>
              {uploadingResume ? (
                <svg viewBox="0 0 24 24" width="22" height="22" className="animate-spin" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M17 8l-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {uploadingResume ? "Uploading…" : "Drop your resume here, or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOC, DOCX · Max 10 MB
              </p>
            </div>
          </label>
        )}

        {errors.resume && <p className="text-xs text-destructive">{errors.resume}</p>}
      </section>

      <section className="px-6 py-6 sm:px-8 sm:py-7 space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              Cover letter
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Optional. Tell us why you&apos;d be a great fit.
            </p>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {form.coverLetter.length}/5000
          </span>
        </div>
        <Textarea
          id="coverLetter"
          value={form.coverLetter}
          onChange={(e) => setField("coverLetter", e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="Share a bit about your background, what excites you about this role, and the impact you'd like to make…"
          aria-invalid={Boolean(errors.coverLetter)}
          className="resize-y min-h-[120px]"
        />
        {errors.coverLetter && <p className="text-xs text-destructive">{errors.coverLetter}</p>}
      </section>

      <section className="px-6 py-5 sm:px-8 sm:py-6 bg-muted/20 space-y-3">
        {topError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <span>{topError}</span>
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            By submitting, you agree to our handling of your application data.
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || uploadingResume}
            className="sm:min-w-[200px]"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </section>
    </form>
  );
}
