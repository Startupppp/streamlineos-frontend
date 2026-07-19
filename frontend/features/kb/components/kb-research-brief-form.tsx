"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { kbResearchBriefSchema, type KbResearchBriefFormValues } from "./kb-research-brief-form-schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateResearchBrief } from "@/hooks/api/kb/research-briefs";
import { useKbSpaces } from "@/hooks/api/kb/spaces";

export function KbResearchBriefForm() {
  const router = useRouter();
  const createMutation = useCreateResearchBrief();
  const { data: spaces } = useKbSpaces();

  const form = useForm<KbResearchBriefFormValues>({
    resolver: zodResolver(kbResearchBriefSchema),
    defaultValues: { topic: "", spaceId: undefined },
  });

  function handleSubmit(values: KbResearchBriefFormValues) {
    createMutation.mutate(
      { topic: values.topic, spaceId: values.spaceId },
      {
        onSuccess: (data) => {
          toast.success("Research brief queued");
          form.reset();
          router.push(`/support/kb/research-briefs/${data.briefId}`);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex items-end gap-3">
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="text-[12px]">Research topic</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. How to configure SSO for enterprise customers"
                  className="text-[13px]"
                />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />
        {spaces && spaces.length > 0 && (
          <FormField
            control={form.control}
            name="spaceId"
            render={({ field }) => (
              <FormItem className="w-[160px]">
                <FormLabel className="text-[12px]">Space (optional)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "all" ? undefined : Number(v))}
                  value={field.value ? String(field.value) : "all"}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue placeholder="All spaces" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All spaces</SelectItem>
                    {spaces.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        )}
        <LoadingButton
          type="submit"
          isPending={createMutation.isPending}
          loadingText="Generating…"
          className="shrink-0"
        >
          Generate brief
        </LoadingButton>
      </form>
    </Form>
  );
}
