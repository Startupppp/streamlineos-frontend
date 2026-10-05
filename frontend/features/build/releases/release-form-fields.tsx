"use client";

import type { Control } from "react-hook-form";
import dynamic from "next/dynamic";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReleaseFormValues } from "./release-form-schema";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[140px]" />
    ),
  },
);

interface ReleaseFormFieldsProps {
  control: Control<ReleaseFormValues>;
  descriptionCharCount: number;
}

export function ReleaseFormFields({ control, descriptionCharCount }: ReleaseFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Q3 Release" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="version"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Version <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. 1.4.0" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="releaseDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Release Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ?? ""}
                  onChange={(val) => field.onChange(val || null)}
                  placeholder="Pick a date"
                  className="text-sm"
                  disablePast
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name="readiness"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Readiness</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="not_started">Not started</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="riskLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Risk Level</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v || null)}
              >
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Release Notes</FormLabel>
              <span className={`text-micro tabular-nums ${descriptionCharCount > 10000 ? "text-destructive" : "text-muted-foreground"}`}>
                {descriptionCharCount.toLocaleString()} / 10,000
              </span>
            </div>
            <FormControl>
              <div className="rounded-md border border-input min-h-[140px]">
                <TiptapEditor
                  content={field.value ?? ""}
                  onChangeHtml={(html) => field.onChange(html || null)}
                  placeholder="Describe what's in this release…"
                  menuMode="static"
                  output="html"
                />
              </div>
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
    </>
  );
}
