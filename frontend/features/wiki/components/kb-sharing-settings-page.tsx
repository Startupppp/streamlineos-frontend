"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useKbSharingSettings, useUpdateKbSharingSettings } from "@/hooks/api/kb/sharing";
import type { SharingSettings } from "@/hooks/api/kb/sharing";
import { sharingSettingsFormSchema, type SharingSettingsFormValues } from "./kb-sharing-settings-schema";
import { KbSharingInventoryTable } from "./kb-sharing-inventory-table";
import { KbSharingSettingsSkeleton } from "./kb-sharing-settings-skeleton";

interface SharingSettingsFormProps {
  settings: SharingSettings;
}

function SharingSettingsForm({ settings }: SharingSettingsFormProps) {
  const updateSettings = useUpdateKbSharingSettings();
  const form = useForm<SharingSettingsFormValues>({
    resolver: zodResolver(sharingSettingsFormSchema),
    defaultValues: {
      externalSharing: settings.externalSharing,
      guestGrantMaxDays: settings.guestGrantMaxDays,
      shareLinkMaxDays: settings.shareLinkMaxDays,
      guestAllowDownloadDefault: settings.guestAllowDownloadDefault,
      shareLinkAllowDownloadDefault: settings.shareLinkAllowDownloadDefault,
    },
  });

  function handleSubmit(values: SharingSettingsFormValues) {
    updateSettings.mutate(values, {
      onSuccess: () => toast.success("Sharing settings saved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="externalSharing"
          render={({ field }) => (
            <FormItem>
              <FormLabel>External sharing mode</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="guests">Guests only</SelectItem>
                  <SelectItem value="guests_and_links">Guests and share links</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="guestGrantMaxDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max guest grant days</FormLabel>
              <FormControl>
                <Input {...field} type="number" min={1} max={365} className="h-9 w-32" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="shareLinkMaxDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max share link days</FormLabel>
              <FormControl>
                <Input {...field} type="number" min={1} max={365} className="h-9 w-32" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="guestAllowDownloadDefault"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal">Allow guest downloads by default</FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="shareLinkAllowDownloadDefault"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal">Allow link downloads by default</FormLabel>
            </FormItem>
          )}
        />
        <div>
          <LoadingButton type="submit" isPending={updateSettings.isPending}>
            Save settings
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}

export default function KbSharingSettingsPage() {
  const { data: settings, isLoading, isError, error } = useKbSharingSettings();

  const pageState = usePageState({
    permission: "kb:settings:manage",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && !settings,
  });

  return (
    <PageWrapper title="External sharing" subtitle="Control how content can be shared outside the organization.">
      <PageState
        resolution={pageState}
        loading={<KbSharingSettingsSkeleton />}
      >
        <div className="flex w-full max-w-lg flex-col gap-6">
          {settings && <SharingSettingsForm key={settings.externalSharing} settings={settings} />}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Sharing inventory</h2>
            <KbSharingInventoryTable />
          </div>
        </div>
      </PageState>
    </PageWrapper>
  );
}
