import { CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompletionScreen({ envelopeTitle, everyoneDone }: { envelopeTitle: string; everyoneDone: boolean }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center bg-background">
      <div className="rounded-full bg-status-success-surface p-4">
        <CheckCircle2 className="size-10 text-status-success-ink" />
      </div>
      <div className="max-w-sm space-y-1.5">
        <h1 className="text-lg font-semibold text-foreground">You&apos;re all signed!</h1>
        <p className="text-sm font-medium text-muted-foreground">{envelopeTitle}</p>
        <p className="text-sm text-muted-foreground">
          {everyoneDone
            ? "Every signer has completed this document. A copy is on its way to your email."
            : "Thanks for signing. We're waiting on the remaining signers before the final copy is ready — we'll email it to you once everyone has completed it."}
        </p>
      </div>
      {everyoneDone && (
        <Button variant="outline" disabled>
          <Download className="size-4" />
          Check your email for the signed copy
        </Button>
      )}
    </div>
  );
}
