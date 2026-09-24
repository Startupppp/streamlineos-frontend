"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { SandboxCatalogue, SandboxEvent } from "@/hooks/api/hr/recruitment/developer-sandbox-schema";

interface EventCardProps {
  event: SandboxEvent;
}

function EventCard({ event }: EventCardProps) {
  const [showExample, setShowExample] = useState(false);

  const handleToggleExample = useCallback(() => {
    setShowExample((previous) => !previous);
  }, []);

  const handleCopyBody = useCallback(() => {
    void navigator.clipboard
      .writeText(event.exampleBody)
      .then(() => toast.success("Example body copied."))
      .catch(() => toast.error("Could not copy. Select the text instead."));
  }, [event.exampleBody]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="font-mono text-xs font-semibold">{event.value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {event.fields.map((field) => (
            <Badge key={field.field} variant="outline" className="text-micro font-mono">
              {field.field}
              {field.type ? `: ${field.type}` : ""}
            </Badge>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={handleToggleExample} className="h-7 px-2">
          {showExample ? "Hide signed example" : "Show signed example"}
        </Button>
        {showExample && (
          <div className="space-y-2">
            {/*
              The secret is printed on purpose. It is a published constant that
              signs nothing real, and the pair below is only useful to somebody
              who can reproduce it — the alternative is a developer testing with
              their own live secret to check our arithmetic.
            */}
            <p className="text-xs text-muted-foreground">
              Signed with the published example secret{" "}
              <code className="font-mono">{event.exampleSecret}</code>.
            </p>
            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-2 text-micro font-mono">
              {event.exampleBody}
            </pre>
            <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-2 text-micro font-mono">
              {event.exampleSignature}
            </pre>
            <Button variant="outline" size="sm" onClick={handleCopyBody} className="h-7 px-2">
              Copy body
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EventCatalogueSectionProps {
  catalogue: SandboxCatalogue;
}

/**
 * The five hiring events and how to verify one.
 *
 * Every event ships a body and a signature a reader can reproduce by hand
 * before a single real delivery arrives. A published example that does not
 * verify would be worse than none: the developer would conclude their own
 * implementation is wrong and debug the right thing for the wrong reason.
 */
export function EventCatalogueSection({ catalogue }: EventCatalogueSectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Hiring events</h2>
        <p className="text-xs text-muted-foreground">
          {catalogue.algorithm}. Sent as{" "}
          <code className="font-mono">{catalogue.signatureHeader}</code>, alongside{" "}
          <code className="font-mono">{catalogue.eventHeader}</code> and{" "}
          <code className="font-mono">{catalogue.timestampHeader}</code>.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {catalogue.events.map((event) => (
          <EventCard key={event.value} event={event} />
        ))}
      </div>
    </section>
  );
}
