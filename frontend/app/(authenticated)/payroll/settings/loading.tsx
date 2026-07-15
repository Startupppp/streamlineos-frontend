import { PageWrapper } from "@/components/ui/page-wrapper";

export function SettingsPageSkeleton() {
  return (
    <PageWrapper title="Payroll Settings">
      <div className="space-y-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-40" />
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}

export default function Loading() {
  return <SettingsPageSkeleton />;
}
