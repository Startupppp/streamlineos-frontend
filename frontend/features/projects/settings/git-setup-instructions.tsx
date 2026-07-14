import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";

export function SetupInstructions() {
  return (
    <div className={cn(PM_PANEL, "border-dashed p-4")}>
      <h3 className="mb-2 text-sm font-semibold text-foreground">How it works</h3>
      <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p>
          Add a connection, then paste the webhook URL into your repository settings (GitHub:{" "}
          <span className="font-mono text-foreground/80">Settings → Webhooks</span>, GitLab:{" "}
          <span className="font-mono text-foreground/80">Settings → Webhooks</span>).
        </p>
        <p>
          For GitHub set the content type to{" "}
          <span className="font-mono text-foreground/80">application/json</span> and paste the
          secret into the <span className="font-mono text-foreground/80">Secret</span> field. For
          GitLab paste the secret into the{" "}
          <span className="font-mono text-foreground/80">Secret token</span> field.
        </p>
        <p>
          Reference a ticket in a commit message or pull request title using its key (
          <span className="font-mono text-foreground/80">ABC-12-34</span>) or number (
          <span className="font-mono text-foreground/80">#34</span>) to link it automatically.
        </p>
      </div>
    </div>
  );
}
