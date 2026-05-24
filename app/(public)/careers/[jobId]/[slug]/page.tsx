import { getJobPostingMetadata } from "@/server/queries/public";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JobDetailView } from "../_components/job-detail-view";

export const revalidate = 300;

type Props = {
  params: Promise<{ jobId: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jobId } = await params;
  const id = Number(jobId);
  if (!Number.isFinite(id)) return { title: "Job Not Found" };

  const job = await getJobPostingMetadata(id);
  if (!job) return { title: "Job Not Found" };
  return {
    title: job.title,
    description: `${job.title}${job.location ? ` · ${job.location}` : ""} — Apply at Vaivamm Capital`,
  };
}

export default async function JobDetailPageWithSlug({ params }: Props) {
  const { jobId } = await params;
  const id = Number(jobId);
  if (!Number.isFinite(id)) notFound();

  return <JobDetailView jobId={id} />;
}
