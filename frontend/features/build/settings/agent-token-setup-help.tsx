"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { CopyIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function CopySnippetButton({ text }: { text: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy"
      {...hoverHandlers}
    >
      <CopyIcon ref={iconRef} size={14} />
    </button>
  );
}

export function SetupHelp() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const cursorSnippet = JSON.stringify(
    {
      mcpServers: {
        streamlineos: {
          command: "node",
          args: ["<repo>/backend/scripts/mcp-server.mjs"],
          env: {
            STREAMLINEOS_TOKEN: "<your-token>",
            STREAMLINEOS_API_URL: apiUrl,
          },
        },
      },
    },
    null,
    2,
  );

  const claudeSnippet = `claude mcp add streamlineos -e STREAMLINEOS_TOKEN=<your-token> -e STREAMLINEOS_API_URL=${apiUrl} -- node <repo>/backend/scripts/mcp-server.mjs`;

  return (
    <Accordion type="single" collapsible className="border-t border-border/60">
      <AccordionItem value="setup" className="border-0">
        <AccordionTrigger className="py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:no-underline">
          Setup instructions
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-1">
          <p className="text-xs text-muted-foreground">
            See{" "}
            <code className="rounded bg-muted px-1 text-[11px]">docs/mcp-agent-access.md</code>{" "}
            for full docs.
          </p>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">
              Cursor — <code className="rounded bg-muted px-1 text-[11px]">.cursor/mcp.json</code>
            </p>
            <div className="relative rounded-md bg-muted p-3">
              <pre className="pr-7 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
                {cursorSnippet}
              </pre>
              <div className="absolute top-2 right-2">
                <CopySnippetButton text={cursorSnippet} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Claude Code</p>
            <div className="relative rounded-md bg-muted p-3">
              <pre className="pr-7 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
                {claudeSnippet}
              </pre>
              <div className="absolute top-2 right-2">
                <CopySnippetButton text={claudeSnippet} />
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
