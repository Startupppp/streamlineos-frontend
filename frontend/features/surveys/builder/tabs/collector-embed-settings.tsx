"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePatchCollector, type SurveyCollector } from "@/hooks/api/surveys/collectors";
import { allowedOriginsSchema, embedSnippetFor, parseAllowedOrigins, type AllowedOriginsValues } from "./collector-embed-schema";

interface CollectorEmbedSettingsProps {
  surveyId: number;
  collector: SurveyCollector;
}

function storedOrigins(settings: Record<string, unknown>): string {
  const origins = settings["allowedOrigins"];
  return Array.isArray(origins) ? origins.filter((o): o is string => typeof o === "string").join(", ") : "";
}

export function CollectorEmbedSettings({ surveyId, collector }: CollectorEmbedSettingsProps) {
  const patchCollector = usePatchCollector(surveyId);
  const form = useForm<AllowedOriginsValues>({
    resolver: zodResolver(allowedOriginsSchema),
    defaultValues: { allowedOrigins: storedOrigins(collector.settings) },
  });
  const snippet = embedSnippetFor(typeof window === "undefined" ? "" : window.location.origin, collector.token);

  async function handleCopySnippet() {
    await navigator.clipboard.writeText(snippet);
    toast.success("Embed code copied");
  }

  async function handleSave(values: AllowedOriginsValues) {
    try {
      await patchCollector.mutateAsync({
        collectorId: collector.id,
        input: { settings: { ...collector.settings, allowedOrigins: parseAllowedOrigins(values.allowedOrigins) } },
      });
      toast.success("Allowed sites saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex items-center gap-2">
        <Input readOnly value={snippet} aria-label="Embed code" className="flex-1 font-mono text-xs" />
        <AnimatedIconButton icon={CopyIcon} iconSize={14} variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Copy embed code" onClick={handleCopySnippet} />
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col gap-2">
          <FormField
            control={form.control}
            name="allowedOrigins"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Allowed sites</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://www.example.com" />
                </FormControl>
                <FormDescription>Only these sites can show this survey in a frame. Separate sites with commas.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <LoadingButton type="submit" size="sm" variant="outline" className="self-start" isPending={patchCollector.isPending}>
            Save allowed sites
          </LoadingButton>
        </form>
      </Form>
    </div>
  );
}
