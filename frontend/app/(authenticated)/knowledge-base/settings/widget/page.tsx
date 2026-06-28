"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { Code2, Copy, Globe, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function FloatingButtonPreview() {
  return (
    <div className="relative w-full h-48 rounded-lg border border-border bg-muted/30 overflow-hidden">
      <div className="absolute inset-0 flex flex-col gap-2 p-4 opacity-20">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded-full bg-foreground"
            style={{ width: `${60 + (i % 3) * 20}%` }}
          />
        ))}
      </div>
      <div className="absolute bottom-4 right-4">
        <button
          type="button"
          aria-label="Help (preview)"
          className="rounded-full bg-[#6366f1] text-white border-none px-5 py-2.5 text-sm font-semibold cursor-default shadow-lg select-none"
          tabIndex={-1}
        >
          Help
        </button>
      </div>
      <div className="absolute top-2 right-2">
        <Badge variant="secondary" className="text-[10px]">Preview</Badge>
      </div>
    </div>
  );
}

export default function KbWidgetPage() {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";

  const embedSnippet = orgId
    ? `<script src="https://api.streamlineos.com/public/kb/widget/${orgId}/script"></script>`
    : "";

  const handleCopy = useCallback(() => {
    if (!embedSnippet) return;
    navigator.clipboard
      .writeText(embedSnippet)
      .then(() => toast.success("Snippet copied to clipboard"))
      .catch(() => toast.error("Failed to copy to clipboard"));
  }, [embedSnippet]);

  return (
    <PageWrapper
      title="Help Widget"
      subtitle="Add a floating help button to your website that opens your knowledge base."
    >
      <div className="max-w-2xl space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              Embed snippet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste this snippet before{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">&lt;/body&gt;</code>{" "}
              to add a help button to your website.
            </p>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 rounded-md border border-border bg-muted/40 px-3 py-2.5">
                {orgId ? (
                  <code className="text-xs font-mono break-all text-foreground leading-relaxed">
                    {embedSnippet}
                  </code>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Org ID unavailable — please refresh and try again.
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={handleCopy}
                disabled={!orgId}
                aria-label="Copy embed snippet"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FloatingButtonPreview />
            <p className="mt-3 text-xs text-muted-foreground">
              The button appears fixed in the bottom-right corner of the page. Clicking it opens your
              public help center in a new tab.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              How it works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
            <p>
              The script loads a lightweight, self-contained floating button — no external dependencies
              or third-party tracking.
            </p>
            <p>
              On click it opens{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">
                https://app.streamlineos.com/help/{orgId || "<orgId>"}
              </code>{" "}
              in a new tab, where visitors can browse and search your published articles.
            </p>
            <p>
              The button is injected only once per page load and respects any existing{" "}
              <code className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">z-index</code>{" "}
              stacking on your site.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
