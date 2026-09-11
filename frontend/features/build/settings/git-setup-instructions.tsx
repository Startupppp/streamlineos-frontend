import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome";

type SetupStep = {
  title: string;
  body: ReactNode;
};

const GITHUB_STEPS: SetupStep[] = [
  {
    title: "Add a connection",
    body: "Create a GitHub connection for your repository. We generate a webhook URL and secret for you.",
  },
  {
    title: "Paste the webhook",
    body: (
      <>
        In GitHub, open{" "}
        <span className="font-mono text-foreground/80">Settings → Webhooks → Add webhook</span>{" "}
        and paste the webhook URL.
      </>
    ),
  },
  {
    title: "Configure the secret",
    body: (
      <>
        Set content type to{" "}
        <span className="font-mono text-foreground/80">application/json</span>, paste the secret into
        the <span className="font-mono text-foreground/80">Secret</span> field, and enable push + pull
        request events.
      </>
    ),
  },
  {
    title: "Reference tickets",
    body: (
      <>
        Mention a ticket in a commit message or pull request title using its key (
        <span className="font-mono text-foreground/80">ABC-12-34</span>) or number (
        <span className="font-mono text-foreground/80">#34</span>) to link it automatically.
      </>
    ),
  },
];

export function SetupInstructions({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn(!compact && PM_PANEL, !compact && "p-4 sm:p-5", className)}>
      <h3 className="mb-1 text-sm font-semibold text-foreground">How it works</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Connect a GitHub repository once, then commits and PRs link to tickets automatically.
      </p>
      <ol className="space-y-3">
        {GITHUB_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 space-y-0.5 pt-0.5">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
