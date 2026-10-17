"use client";

import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MemberPicker } from "@/components/members/member-picker";
import { ProductReleaseCanonicalField } from "./product-release-canonical-field";
import type { ReleaseFormValues } from "./product-release-form-schema";

interface ProductReleaseFormFieldsProps {
  managedProductId: number;
  initialProjectId?: number | null;
  initialProjectLabel?: string | null;
  initialReleaseLabel?: string | null;
}

export function ProductReleaseFormFields({
  managedProductId,
  initialProjectId,
  initialProjectLabel,
  initialReleaseLabel,
}: ProductReleaseFormFieldsProps) {
  const form = useFormContext<ReleaseFormValues>();

  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Name <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input {...field} placeholder="Release name" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="version"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Version <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input {...field} placeholder="1.0.0" className="font-mono tabular-nums" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status <span aria-hidden="true" className="text-destructive">*</span></FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="releaseDate"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Release date (optional)</FormLabel>
            <FormControl>
              <DatePicker
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Pick a date"
                dateFormat="dd MMM yyyy"
                clearable
                compactCalendar
                ariaLabel="Release date"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ownerUserId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Owner (optional)</FormLabel>
            <FormControl>
              <MemberPicker
                mode="single"
                value={field.value ?? undefined}
                onChange={(userId) => field.onChange(userId ?? null)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="qaState"
        render={({ field }) => (
          <FormItem>
            <FormLabel>QA state (optional)</FormLabel>
            <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_review">In review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="deploymentEvidenceUrl"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Deployment evidence URL (optional)</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder="https://ci.example.com/build/42"
                type="url"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <ProductReleaseCanonicalField
        managedProductId={managedProductId}
        initialProjectId={initialProjectId ?? null}
        initialProjectLabel={initialProjectLabel ?? null}
        initialReleaseLabel={initialReleaseLabel ?? null}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Description (optional)</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ""}
                rows={3}
                placeholder="What ships in this version…"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
