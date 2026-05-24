import { getJobPostingDetail, getDepartmentName } from "@/server/queries/public";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CareersBrand } from "../../_components/careers-brand";
import { ApplyForm } from "./apply-form";

export const revalidate = 300;

type Props = { params: Promise<{ jobId: string }> };

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jobId } = await params;
  const id = Number(jobId);
  if (!Number.isFinite(id)) return { title: "Apply" };
  const job = await getJobPostingDetail(id);
  if (!job) return { title: "Apply" };
  return { title: `Apply · ${job.title}` };
}

export default async function ApplyPage({ params }: Props) {
  const { jobId } = await params;
  const id = Number(jobId);
  if (!Number.isFinite(id)) notFound();

  const job = await getJobPostingDetail(id);
  if (!job) notFound();

  const deptName = job.departmentId ? await getDepartmentName(job.departmentId) : null;
  const typeLabel = job.type ? (JOB_TYPE_LABELS[job.type] ?? job.type) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <CareersBrand />
          <Link
            href={`/careers/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back to job
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="mb-6 lg:mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">
            Job Application
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-foreground">
            {job.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {deptName && <span>{deptName}</span>}
            {deptName && (job.location || typeLabel) && <span aria-hidden>·</span>}
            {job.location && <span>{job.location}</span>}
            {job.location && typeLabel && <span aria-hidden>·</span>}
            {typeLabel && <span>{typeLabel}</span>}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <ApplyForm jobId={id} jobTitle={job.title} />
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="rounded-2xl border bg-card p-5">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
                  What happens next
                </p>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="shrink-0 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-foreground">We review your profile</p>
                      <p className="text-muted-foreground text-xs mt-0.5">Usually within 3–5 business days.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Intro call</p>
                      <p className="text-muted-foreground text-xs mt-0.5">A 20-minute chat with our recruiter.</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      3
                    </span>
                    <div>
                      <p className="font-medium text-foreground">Meet the team</p>
                      <p className="text-muted-foreground text-xs mt-0.5">Role-specific interviews with the hiring panel.</p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="rounded-2xl border border-dashed bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your information is used only for this application and stored securely.
                  We will not share your data with third parties.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Vaivamm Capital. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
