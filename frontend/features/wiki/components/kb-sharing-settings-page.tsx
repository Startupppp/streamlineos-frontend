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
  FormDescription,
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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getErrorMessage } from "@/lib/get-error-message";
import { useKbSharingSettings, useUpdateKbSharingSettings } from "@/hooks/api/kb/sharing";
import type { SharingSettings } from "@/hooks/api/kb/sharing";
import {
  sharingSettingsFormSchema,
  type SharingSettingsFormValues,
} from "./kb-sharing-settings-schema";
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
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Policy</CardTitle>
            <CardDescription>
              Defaults for guest access and share links across Docs.
            </CardDescription>
            <CardAction className="max-sm:col-span-full max-sm:row-start-3 max-sm:mt-2 max-sm:w-full max-sm:justify-self-stretch">
              <LoadingButton
                type="submit"
                isPending={updateSettings.isPending}
                className="w-full sm:w-auto"
              >
                Save settings
              </LoadingButton>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="externalSharing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External sharing mode</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="guests">Guests only</SelectItem>
                      <SelectItem value="guests_and_links">
                        Guests and share links
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="guestGrantMaxDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max guest grant days</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={365}
                        className="h-9 w-full"
                      />
                    </FormControl>
                    <FormDescription>Longest guest invite can last.</FormDescription>
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
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={365}
                        className="h-9 w-full"
                      />
                    </FormControl>
                    <FormDescription>Longest public link can last.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="divide-y divide-border rounded-lg border border-border">
              <FormField
                control={form.control}
                name="guestAllowDownloadDefault"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 space-y-0 px-3 py-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="min-w-0 space-y-0.5">
                      <FormLabel className="font-normal leading-snug">
                        Allow guest downloads by default
                      </FormLabel>
                      <FormDescription>
                        Guests can download files unless a share overrides this.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shareLinkAllowDownloadDefault"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 space-y-0 px-3 py-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    </FormControl>
                    <div className="min-w-0 space-y-0.5">
                      <FormLabel className="font-normal leading-snug">
                        Allow link downloads by default
                      </FormLabel>
                      <FormDescription>
                        Anyone with a share link can download unless overridden.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
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
    <PageWrapper
      title="External sharing"
      subtitle="Control how content can be shared outside the organization."
    >
      <PageState
        resolution={pageState}
        loading={<KbSharingSettingsSkeleton />}
        className="gap-4"
      >
        <div className="flex w-full min-w-0 flex-col gap-4">
          {settings ? (
            <SharingSettingsForm
              key={settings.externalSharing}
              settings={settings}
            />
          ) : null}
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-sm">Sharing inventory</CardTitle>
              <CardDescription>
                Active guest grants and share links across the organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 pt-0">
              <KbSharingInventoryTable />
            </CardContent>
          </Card>
        </div>
      </PageState>
    </PageWrapper>
  );
}
