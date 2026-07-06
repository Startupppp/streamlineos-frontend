import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupInstructions() {
  return (
    <Card className="shadow-noir border-dashed">
      <CardHeader>
        <CardTitle className="text-sm">How it works</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
        <p>
          Add a connection, then paste the webhook URL into your repository
          settings (GitHub:{" "}
          <span className="font-mono">Settings → Webhooks</span>, GitLab:{" "}
          <span className="font-mono">Settings → Webhooks</span>).
        </p>
        <p>
          For GitHub set the content type to{" "}
          <span className="font-mono">application/json</span> and paste the
          secret into the <span className="font-mono">Secret</span> field. For
          GitLab paste the secret into the{" "}
          <span className="font-mono">Secret token</span> field.
        </p>
        <p>
          Reference a ticket in a commit message or pull request title using its
          key (<span className="font-mono">ABC-12-34</span>) or number (
          <span className="font-mono">#34</span>) to link it automatically.
        </p>
      </CardContent>
    </Card>
  );
}
