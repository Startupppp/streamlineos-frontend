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

function selectSpaceId(
  onChange: (spaceId: number | undefined) => void,
): (value: string) => void {
  return function handleSpaceSelected(value) {
    onChange(value === "all" ? undefined : Number(value));
  };
}

interface KbResearchBriefFormProps {
  basePath: string;
}

export function KbResearchBriefForm({ basePath }: KbResearchBriefFormProps) {
  const router = useRouter();
  const createMutation = useCreateResearchBrief();
  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data;

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
          router.push(`${basePath}/${data.briefId}`);
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
              <FormLabel className="text-xs">Research topic</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. How to configure SSO for enterprise customers"
                  className="text-label"
                />
              </FormControl>
              <FormMessage className="text-dense" />
            </FormItem>
          )}
        />
        {spaces && spaces.data.length > 0 && (
          <FormField
            control={form.control}
            name="spaceId"
            render={({ field }) => (
              <FormItem className="w-[160px]">
                <FormLabel className="text-xs">Space (optional)</FormLabel>
                <Select
                  onValueChange={selectSpaceId(field.onChange)}
                  value={field.value ? String(field.value) : "all"}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 text-label">
                      <SelectValue placeholder="All spaces" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All spaces</SelectItem>
                    {spaces.data.map((s) => (
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
