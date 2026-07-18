"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CycleNotFound() {
  const params = useParams();
  const projectId = params?.projectId as string | undefined;
  const cyclesHref = projectId ? `/projects/${projectId}/cycles` : "/projects";

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 px-6 text-center min-h-[40dvh] gap-4">
      <p className="text-4xl font-bold text-foreground tracking-tight">Cycle not found</p>
      <p className="text-muted-foreground text-base max-w-sm">
        This cycle may have been deleted or the link is invalid.
      </p>
      <Button asChild variant="secondary" size="sm">
        <Link href={cyclesHref}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cycles
        </Link>
      </Button>
    </div>
  );
}
