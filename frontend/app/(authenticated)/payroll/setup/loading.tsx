import { PageWrapper } from "@/components/ui/page-wrapper";

export function SetupPageSkeleton() {
  return (
    <PageWrapper title="Payroll Setup" subtitle="Configure your payroll in 5 steps">
      <div className="max-w-2xl mx-auto py-4 space-y-4">
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full animate-pulse w-full" />
          <div className="h-[400px] bg-card rounded-xl border border-border animate-pulse" />
        </div>
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <SetupPageSkeleton />;
}
