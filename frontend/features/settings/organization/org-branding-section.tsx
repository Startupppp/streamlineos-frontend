"use client";

import { useCallback } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import type { OrgSettings } from "@/types/organization";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  OrgSettingsCard,
  OrgSettingsEditButton,
  OrgSettingsFormActions,
} from "./org-settings-chrome";
import { resolveImageUrl } from "@/lib/utils";
import { HEX_COLOR, brandingSchema, type BrandingValues } from "./org-branding-schema";
import {
  BrandingSummary,
  ColorField,
  UploadButton,
  EmailBrandingPreview,
} from "./org-branding-fields";
import { useOrgBrandingUpload } from "./use-org-branding-upload";
import { useOrganizationSettingsForm } from "./use-organization-settings-form";

interface OrgBrandingSectionProps {
  org: OrgSettings;
  canEdit: boolean;
}

function toBrandingValues(org: OrgSettings): BrandingValues {
  return {
    logo: org.logo ?? "",
    favicon: org.favicon ?? "",
    primaryColor: org.primaryColor ?? "#0b1220",
    secondaryColor: org.secondaryColor ?? "",
    loginBgUrl: org.loginBgUrl ?? "",
  };
}

export function OrgBrandingSection({ org, canEdit }: OrgBrandingSectionProps) {
  const mutation = useUpdateOrgSettings();
  const { form, isEditing, isSaving, handleEdit, handleCancel, save } =
    useOrganizationSettingsForm({
      resolver: zodResolver(brandingSchema),
      serverValues: toBrandingValues(org),
      mutation,
      successMessage: "Branding saved",
    });

  const {
    logoInputRef,
    faviconInputRef,
    logoUploading,
    faviconUploading,
    handleLogoUpload,
    handleFaviconUpload,
    handleClickLogoInput,
    handleClickFaviconInput,
  } = useOrgBrandingUpload(form);

  const handleSave = useCallback(
    (values: BrandingValues) => {
      save({
        logo: values.logo || null,
        favicon: values.favicon || null,
        primaryColor: HEX_COLOR.test(values.primaryColor ?? "") ? values.primaryColor : null,
        secondaryColor: HEX_COLOR.test(values.secondaryColor ?? "") ? values.secondaryColor : null,
        loginBgUrl: values.loginBgUrl || null,
      });
    },
    [save],
  );

  const logoVal = form.watch("logo") ?? "";
  const faviconVal = form.watch("favicon") ?? "";
  const primaryVal = form.watch("primaryColor") ?? "#0b1220";
  const secondaryVal = form.watch("secondaryColor") ?? "";

  return (
    <OrgSettingsCard
      title="Branding"
      description="Logo, favicon, colors, and email branding defaults."
      icon={<Palette className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      action={canEdit && !isEditing ? <OrgSettingsEditButton onClick={handleEdit} /> : undefined}
    >
      {!isEditing ? (
        <BrandingSummary org={org} />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Logo</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} placeholder="https://cdn.example.com/logo.png" className="flex-1" />
                      </FormControl>
                      <UploadButton uploading={logoUploading} onClick={handleClickLogoInput} />
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </div>
                    {logoVal && (
                      <Image
                        src={resolveImageUrl(logoVal) ?? logoVal}
                        alt="Logo preview"
                        width={160}
                        height={32}
                        className="h-8 w-auto rounded border border-border mt-1 object-contain"
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="favicon"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">
                      Favicon{" "}
                      <span className="text-muted-foreground font-normal">(max 256 KB)</span>
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://cdn.example.com/favicon.ico"
                          className="flex-1"
                        />
                      </FormControl>
                      <UploadButton uploading={faviconUploading} onClick={handleClickFaviconInput} />
                      <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg"
                        className="hidden"
                        onChange={handleFaviconUpload}
                      />
                    </div>
                    {faviconVal && (
                      <Image
                        src={resolveImageUrl(faviconVal) ?? faviconVal}
                        alt="Favicon preview"
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded border border-border mt-1 object-contain"
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => {
                  function handlePrimaryColorChange(v: string) {
                    field.onChange(v);
                  }
                  return (
                    <FormItem className="gap-1.5">
                      <ColorField
                        label="Primary color"
                        value={field.value ?? "#0b1220"}
                        onChange={handlePrimaryColorChange}
                        error={form.formState.errors.primaryColor?.message}
                      />
                      <FormMessage className="hidden" />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="secondaryColor"
                render={({ field }) => {
                  function handleSecondaryColorChange(v: string) {
                    field.onChange(v);
                  }
                  return (
                    <FormItem className="gap-1.5">
                      <ColorField
                        label="Secondary color"
                        value={field.value ?? ""}
                        onChange={handleSecondaryColorChange}
                        error={form.formState.errors.secondaryColor?.message}
                      />
                      <FormMessage className="hidden" />
                    </FormItem>
                  );
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="loginBgUrl"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <FormLabel className="text-xs">Login page background URL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://cdn.example.com/bg.jpg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <EmailBrandingPreview
              logo={logoVal}
              primaryColor={HEX_COLOR.test(primaryVal) ? primaryVal : "#0b1220"}
              secondaryColor={HEX_COLOR.test(secondaryVal) ? secondaryVal : undefined}
            />

            <OrgSettingsFormActions onCancel={handleCancel} isPending={isSaving}>
              <LoadingButton
                type="submit"
                isPending={isSaving}
                size="sm"
                className="gap-1.5"
                loadingText="Saving…"
              >
                Save branding
              </LoadingButton>
            </OrgSettingsFormActions>
          </form>
        </Form>
      )}
    </OrgSettingsCard>
  );
}
