"use client";

import { Database, FileX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSeedPayrollSampleData } from "@/hooks/api/payroll/sample-data";

export function SampleDataChoice({ onStartEmpty }: { onStartEmpty: () => void }) {
  const seed = useSeedPayrollSampleData();

  function handleSeed() {
    seed.mutate(undefined, {
      onSuccess: () => toast.success("Sample data added — 5 sample people"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <section aria-labelledby="payroll-first-run" className="rounded-xl border border-border bg-card p-4">
      <h2 id="payroll-first-run" className="text-sm font-semibold">
        How do you want to start?
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        You have no payable people yet. Try payroll on sample people, or start with your own.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <Database className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Start with sample data</p>
          <p className="text-xs text-muted-foreground">
            Adds 5 clearly labelled sample people, 3 with salaries. Remove them anytime.
          </p>
          <LoadingButton
            size="sm"
            className="mt-auto self-start"
            onClick={handleSeed}
            isPending={seed.isPending}
            loadingText="Adding…"
          >
            Add sample data
          </LoadingButton>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <FileX className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium">Start empty</p>
          <p className="text-xs text-muted-foreground">
            Add your real people from the directory and follow the setup guide.
          </p>
          <Button size="sm" variant="outline" className="mt-auto self-start" onClick={onStartEmpty}>
            Start empty
          </Button>
        </div>
      </div>
    </section>
  );
}
