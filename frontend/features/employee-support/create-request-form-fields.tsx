"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Info } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useMySupportSuggest } from "@/hooks/api/employee-self-service/support";
import { HELPDESK_CATEGORIES, HELPDESK_CATEGORY_LABELS } from "@/lib/employee-support";
import { REQUEST_PRIORITY_LABELS } from "./support-request-badges";
import type { CreateRequestInput } from "./create-request-schema";

const CATEGORY_HINT = "The category decides which team receives the request.";
const CONFIDENTIAL_HINT =
  "Only members of the receiving queue and you can see a confidential request. HR and Legal requests are confidential by default.";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

interface CreateRequestFormFieldsProps {
  form: UseFormReturn<CreateRequestInput>;
}

export function CreateRequestFormFields({ form }: CreateRequestFormFieldsProps) {
  const [titleQuery, setTitleQuery] = useState("");
  const debouncedTitle = useDebouncedValue(titleQuery, 300);
  const suggestions = useMySupportSuggest(debouncedTitle.length >= 3 ? debouncedTitle : "");
  const results = suggestions.data?.results ?? [];

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => {
          function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
            field.onChange(event);
            setTitleQuery(event.target.value);
          }
          return (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} onChange={handleTitleChange} placeholder="Brief summary of your request" />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      {results.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">Articles that may already answer this</p>
          <ul className="space-y-1">
            {results.map((result) => (
              <li key={`${result.source}-${result.id}`} className="min-w-0">
                <TruncatedText text={result.title} className="text-xs font-medium text-foreground" />
                {result.excerpt ? (
                  <TruncatedText text={result.excerpt} className="text-xs text-muted-foreground" />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-1">
                <FormLabel className="mb-0">Category</FormLabel>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="About categories"
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[16rem] text-xs leading-relaxed">
                    {CATEGORY_HINT}
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {HELPDESK_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {HELPDESK_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Medium" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {REQUEST_PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} rows={4} placeholder="Describe your issue or request in detail" className="resize-none" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isConfidential"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3 rounded-lg border border-border p-3">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="flex min-w-0 items-center gap-1">
              <FormLabel className="mb-0 cursor-pointer text-sm font-medium">Confidential</FormLabel>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="About confidential requests"
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[16rem] text-xs leading-relaxed">
                  {CONFIDENTIAL_HINT}
                </TooltipContent>
              </Tooltip>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
