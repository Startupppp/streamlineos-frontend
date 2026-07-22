import Link from "next/link";
import { ConnectionLostIllustration } from "@/components/illustrations";

export function BackendUnavailableView() {
  return (
    <div className="flex flex-1 min-h-full w-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <ConnectionLostIllustration className="mx-auto mb-6 h-48 w-48" />
        <h2 className="mb-2 text-xl font-bold text-foreground">Backend unavailable</h2>
        <p className="mb-1 text-sm text-muted-foreground">
          The API server could not be reached during page render.
        </p>
        <p className="mb-5 text-sm text-muted-foreground">
          Start the NestJS backend with{" "}
          <code className="rounded bg-muted px-1 text-xs">pnpm -C backend dev</code> and confirm{" "}
          <code className="rounded bg-muted px-1 text-xs">NEXT_PUBLIC_API_URL</code> matches its address.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Back to Projects
        </Link>
      </div>
    </div>
  );
}
