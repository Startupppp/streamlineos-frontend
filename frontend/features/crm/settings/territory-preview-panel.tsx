"use client";

import { useCallback, useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { usePreviewTerritory } from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";

/**
 * "Which territory would this lead land in?"
 *
 * Not a record surface and deliberately not rendered by the engine: nothing here
 * is stored, so there is no record to describe. It is a question asked of the
 * server and its answer.
 */
export function TerritoryPreviewPanel() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const preview = usePreviewTerritory();

  const handleRun = useCallback(() => {
    preview.mutate(
      {
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
        industry: industry || undefined,
      },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
  }, [preview, city, state, country, industry]);

  const handleCity = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value), []);
  const handleState = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setState(e.target.value), []);
  const handleCountry = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCountry(e.target.value), []);
  const handleIndustry = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setIndustry(e.target.value), []);

  const matched = preview.data?.matchedTerritory;
  const matchTone = statusToneClasses(matched ? "success" : "neutral");

  return (
    <Card className="shrink-0">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Eye className="h-4 w-4 text-primary" />
          Try a lead against these rules
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-gap-toolbar px-4 pb-4">
        <div className="grid grid-cols-1 gap-gap-toolbar sm:grid-cols-4">
          <div className="flex flex-col gap-gap-inline">
            <Label htmlFor="territory-preview-city">City</Label>
            <Input id="territory-preview-city" value={city} onChange={handleCity} placeholder="Mumbai" />
          </div>
          <div className="flex flex-col gap-gap-inline">
            <Label htmlFor="territory-preview-state">State</Label>
            <Input id="territory-preview-state" value={state} onChange={handleState} placeholder="Maharashtra" />
          </div>
          <div className="flex flex-col gap-gap-inline">
            <Label htmlFor="territory-preview-country">Country</Label>
            <Input id="territory-preview-country" value={country} onChange={handleCountry} placeholder="India" />
          </div>
          <div className="flex flex-col gap-gap-inline">
            <Label htmlFor="territory-preview-industry">Industry</Label>
            <Input id="territory-preview-industry" value={industry} onChange={handleIndustry} placeholder="Technology" />
          </div>
        </div>

        <LoadingButton
          type="button"
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={handleRun}
          isPending={preview.isPending}
          loadingText="Checking…"
        >
          Run preview
        </LoadingButton>

        {preview.data ? (
          <div className="flex flex-col gap-gap-inline rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`h-5 px-2 text-micro ${matchTone.surface} ${matchTone.inkStrong} ${matchTone.rule}`}
              >
                {matched ? "Match" : "No match"}
              </Badge>
              <span className="text-sm font-medium">
                {matched ? matched.name : "No territory covers this lead"}
              </span>
            </div>
            {preview.data.assignedRepNames.length > 0 ? (
              <span className="text-dense text-muted-foreground">
                Would go to {preview.data.assignedRepNames.join(", ")}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
