"use client";

import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { MemberPicker } from "@/components/members/member-picker";
import { useManagedProductProjects } from "@/hooks/api/build/managed-product-projects";
import { useReleases } from "@/hooks/api/build/releases";
import type { ReleaseFormValues } from "./product-release-form-schema";

interface ProductReleaseFormFieldsProps {
  managedProductId: number;
  initialProjectId?: number | null;
}

export function ProductReleaseFormFields({ managedProductId, initialProjectId }: ProductReleaseFormFieldsProps) {
  const form = useFormContext<ReleaseFormValues>();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(initialProjectId ?? null);

  const projectsQuery = useManagedProductProjects({ managedProductId });
  const releasesQuery = useReleases(selectedProjectId ?? 0);

  const projectOptions = useMemo(
    () => projectsQuery.data?.data.map((p) => ({ value: p.id, label: p.name })) ?? [],
    [projectsQuery.data],
  );

  const releaseOptions = useMemo(
    () => releasesQuery.data?.data.map((r) => ({ value: r.id, label: `${r.name} ${r.version}` })) ?? [],
    [releasesQuery.data],
  );

  function handleProjectChange(rawValue: string) {
    const id = rawValue ? Number(rawValue) : null;
    setSelectedProjectId(id);
    form.setValue("projectReleaseId", null, { shouldDirty: true });
  }

  function handleProjectReleaseChange(rawValue: string) {
    form.setValue("projectReleaseId", rawValue ? Number(rawValue) : null, { shouldDirty: true });
  }

  function handleClearLink() {
    setSelectedProjectId(null);
    form.setValue("projectReleaseId", null, { shouldDirty: true });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Name</FormLabel>
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
            <FormLabel>Version</FormLabel>
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
            <FormLabel>Status</FormLabel>
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
      <FormField
        control={form.control}
        name="projectReleaseId"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Canonical project release (optional)</FormLabel>
            <div className="flex flex-col gap-2">
              <Select
                value={selectedProjectId !== null ? String(selectedProjectId) : ""}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger aria-label="Project for canonical release">
                  <SelectValue placeholder="Pick a project…" />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={field.value != null ? String(field.value) : ""}
                onValueChange={handleProjectReleaseChange}
                disabled={selectedProjectId === null}
              >
                <SelectTrigger aria-label="Canonical release">
                  <SelectValue placeholder="Pick a release…" />
                </SelectTrigger>
                <SelectContent>
                  {releaseOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.value != null ? (
                <Button type="button" variant="outline" size="sm" onClick={handleClearLink}>
                  Clear canonical release link
                </Button>
              ) : null}
            </div>
            <FormMessage />
          </FormItem>
        )}
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
