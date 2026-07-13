"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateJobForm } from "@/features/hr/recruitment/jobs/create-job-form";

export default function NewJobPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-3 px-6 py-3 border-b shrink-0">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
          <Link href="/hr/recruitment/jobs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Jobs
          </Link>
        </Button>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-sm font-semibold">Create New Job Opening</h1>
      </div>
      <div className="flex-1 min-h-0">
        <CreateJobForm />
      </div>
    </div>
  );
}
