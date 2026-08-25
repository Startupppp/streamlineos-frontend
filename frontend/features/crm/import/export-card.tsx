"use client";

import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadExport } from "@/hooks/api/crm/import";
import { getErrorMessage } from "@/lib/get-error-message";
import { EXPORT_ENTITIES } from "@/types/crm/import";

/**
 * Taking everything back out.
 *
 * Shown above the import tabs, deliberately: it is ungated and needs no setup,
 * and a prospect evaluating the product should see that leaving is easy before
 * they are asked to bring anything in.
 */
export function ExportCard() {
  const handleExport = (entity: string, format: "csv" | "json") => () =>
    void downloadExport(entity, format).catch((error) => toast.error(getErrorMessage(error)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Take your data out</CardTitle>
        <CardDescription>
          Everything you have put in, in an open format, at any time. No plan gating, and custom
          fields and history are included.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-gap-field">
        {EXPORT_ENTITIES.map((entity) => (
          <Button
            key={entity}
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport(entity, "csv")}
          >
            <Download className="mr-1.5 size-4" aria-hidden />
            {entity} (CSV)
          </Button>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleExport("archive", "json")}
        >
          <Download className="mr-1.5 size-4" aria-hidden />
          Everything (JSON)
        </Button>
      </CardContent>
    </Card>
  );
}
