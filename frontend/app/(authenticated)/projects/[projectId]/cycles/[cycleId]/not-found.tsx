import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CycleNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 px-6 text-center min-h-[40vh] gap-4">
      <p className="text-4xl font-bold text-foreground tracking-tight">Cycle not found</p>
      <p className="text-muted-foreground text-base max-w-sm">
        This cycle may have been deleted or the link is invalid.
      </p>
      <Button asChild variant="secondary" size="sm">
        <Link href="/projects">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
      </Button>
    </div>
  );
}
