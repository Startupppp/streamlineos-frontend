"use client";

import { useCallback, useState } from "react";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { useTestValidationRules } from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";
import type { CrmValidationEntityType } from "@/types/crm/metadata";

/**
 * "Would this record pass?"
 *
 * Not a record surface: the thing being built here is never saved. It is a
 * question put to the server with a made-up record and the answer it gives back,
 * so there is nothing for a description to describe.
 */
export function ValidationRuleTestPanel({ entityType }: { entityType: CrmValidationEntityType }) {
  const [fieldKey, setFieldKey] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [record, setRecord] = useState<Record<string, string>>({});
  const testRules = useTestValidationRules();

  const handleFieldKey = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setFieldKey(event.target.value),
    [],
  );
  const handleFieldValue = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setFieldValue(event.target.value),
    [],
  );

  const handleAdd = useCallback(() => {
    const key = fieldKey.trim();
    if (!key) return;
    setRecord((previous) => ({ ...previous, [key]: fieldValue }));
    setFieldKey("");
    setFieldValue("");
  }, [fieldKey, fieldValue]);

  const handleRemove = useCallback((key: string) => {
    setRecord((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }, []);

  const handleRun = useCallback(() => {
    testRules.mutate(
      { entityType, record },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
  }, [testRules, entityType, record]);

  const failures = Object.entries(testRules.data?.errors ?? {});
  const passTone = statusToneClasses("success");
  const failTone = statusToneClasses("danger");

  return (
    <Card className="shrink-0">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <FlaskConical className="h-4 w-4 text-primary" />
          Try a record against these rules
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-gap-toolbar px-4 pb-4">
        <div className="flex flex-wrap items-end gap-gap-field">
          <div className="flex min-w-40 flex-1 flex-col gap-gap-inline">
            <Label htmlFor="validation-test-field">Field</Label>
            <Input
              id="validation-test-field"
              value={fieldKey}
              onChange={handleFieldKey}
              placeholder="email"
            />
          </div>
          <div className="flex min-w-40 flex-1 flex-col gap-gap-inline">
            <Label htmlFor="validation-test-value">Value</Label>
            <Input
              id="validation-test-value"
              value={fieldValue}
              onChange={handleFieldValue}
              placeholder="someone@example.com"
            />
          </div>
          <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
            Add
          </Button>
        </div>

        {Object.keys(record).length > 0 ? (
          <div className="flex flex-wrap gap-gap-inline">
            {Object.entries(record).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleRemove(key)}
                aria-label={`Remove ${key}`}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-micro transition-colors hover:border-destructive/40 hover:bg-destructive/10"
              >
                <span className="font-mono text-muted-foreground">{key}</span>
                <span>{value}</span>
                <span className="ml-0.5 text-muted-foreground">×</span>
              </button>
            ))}
          </div>
        ) : null}

        <LoadingButton
          type="button"
          size="sm"
          variant="outline"
          className="w-fit"
          onClick={handleRun}
          isPending={testRules.isPending}
          loadingText="Running…"
        >
          Run test
        </LoadingButton>

        {testRules.data ? (
          <div className="flex flex-col gap-gap-inline rounded-xl border border-border bg-muted/40 p-3">
            {failures.length === 0 ? (
              <span
                className={`w-fit rounded-md border px-2 py-0.5 text-micro font-medium ${passTone.surface} ${passTone.inkStrong} ${passTone.rule}`}
              >
                Every rule passes
              </span>
            ) : (
              failures.map(([field, message]) => (
                <div key={field} className="flex items-start gap-gap-inline">
                  <span
                    className={`shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-micro ${failTone.surface} ${failTone.inkStrong} ${failTone.rule}`}
                  >
                    {field}
                  </span>
                  <span className="text-dense text-muted-foreground">{message}</span>
                </div>
              ))
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
