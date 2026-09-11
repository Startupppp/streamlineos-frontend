"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
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
import { toast } from "sonner";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import type { OrgSettings } from "@/types/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  OrgSettingsCard,
  OrgSettingsEditButton,
  OrgSettingsFormActions,
  SettingsField,
  SettingsFieldGrid,
} from "./org-settings-chrome";
import { HEX_COLOR, brandingSchema, type BrandingValues } from "./org-branding-schema";
import { ColorField, ColorSwatch, EmailBrandingPreview, UploadButton } from "./org-branding-controls";

interface OrgBrandingSectionProps {
  org: OrgSettings;
  canEdit: boolean;
}

export function OrgBrandingSection({ org, canEdit }: OrgBrandingSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { mutate: updateOrg, isPending } = useUpdateOrgSettings();
  const uploadMutation = useUploadFile();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  const form = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      logo: org.logo ?? "",
      favicon: org.favicon ?? "",
      primaryColor: org.primaryColor ?? "#0b1220",
      secondaryColor: org.secondaryColor ?? "",
      loginBgUrl: org.loginBgUrl ?? "",
    },
  });

  const handleEdit = useCallback(() => {
    form.reset({
      logo: org.logo ?? "",
      favicon: org.favicon ?? "",
      primaryColor: org.primaryColor ?? "#0b1220",
      secondaryColor: org.secondaryColor ?? "",
      loginBgUrl: org.loginBgUrl ?? "",
    });
    setIsEditing(true);
  }, [org, form]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    form.reset();
  }, [form]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = field === "favicon" ? 256 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File too large. Max ${field === "favicon" ? "256KB" : "2MB"}.`);
      return;
    }

    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported format. Use PNG, JPEG, WebP, or ICO.");
      return;
    }

    const setter = field === "logo" ? setLogoUploading : setFaviconUploading;
    setter(true);
    try {
      const result = await uploadMutation.mutateAsync({ file, folder: `org-${field}s` });
      form.setValue(field, result.url, { shouldDirty: true });
      toast.success(`${field === "logo" ? "Logo" : "Favicon"} uploaded`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setter(false);
      if (field === "logo" && logoInputRef.current) logoInputRef.current.value = "";
      if (field === "favicon" && faviconInputRef.current) faviconInputRef.current.value = "";
    }
  }, [uploadMutation, form]);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => handleUpload(e, "logo"), [handleUpload]);
  const handleFaviconUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => handleUpload(e, "favicon"), [handleUpload]);
  const handleClickLogoInput = useCallback(() => { logoInputRef.current?.click(); }, []);
  const handleClickFaviconInput = useCallback(() => { faviconInputRef.current?.click(); }, []);

  const handleSave = useCallback((values: BrandingValues) => {
    updateOrg(
      {
        logo: values.logo || null,
        favicon: values.favicon || null,
        primaryColor: HEX_COLOR.test(values.primaryColor ?? "") ? values.primaryColor : null,
        secondaryColor: HEX_COLOR.test(values.secondaryColor ?? "") ? values.secondaryColor : null,
        loginBgUrl: values.loginBgUrl || null,
      },
      {
        onSuccess: () => {
          toast.success("Branding saved");
          setIsEditing(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [updateOrg]);

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
        <SettingsFieldGrid cols={2}>
          <SettingsField label="Logo">
            {org.logo ? (
              <Image src={org.logo} alt="Org logo" width={160} height={32} className="h-8 w-auto rounded border border-border object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
          </SettingsField>
          <SettingsField label="Favicon">
            {org.favicon ? (
              <Image src={org.favicon} alt="Favicon" width={24} height={24} className="h-6 w-6 rounded border border-border object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
          </SettingsField>
          <SettingsField label="Primary color">
            <div className="flex items-center gap-2">
              <ColorSwatch color={org.primaryColor} />
              <p className="text-sm font-mono">{org.primaryColor || <span className="text-muted-foreground font-sans">Not set</span>}</p>
            </div>
          </SettingsField>
          <SettingsField label="Secondary color">
            <div className="flex items-center gap-2">
              <ColorSwatch color={org.secondaryColor} />
              <p className="text-sm font-mono">{org.secondaryColor || <span className="text-muted-foreground font-sans">Not set</span>}</p>
            </div>
          </SettingsField>
        </SettingsFieldGrid>
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
                      <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                    </div>
                    {logoVal && <Image src={logoVal} alt="Logo preview" width={160} height={32} className="h-8 w-auto rounded border border-border mt-1 object-contain" />}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="favicon"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className="text-xs">Favicon <span className="text-muted-foreground font-normal">(max 256 KB)</span></FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} placeholder="https://cdn.example.com/favicon.ico" className="flex-1" />
                      </FormControl>
                      <UploadButton uploading={faviconUploading} onClick={handleClickFaviconInput} />
                      <input ref={faviconInputRef} type="file" accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg" className="hidden" onChange={handleFaviconUpload} />
                    </div>
                    {faviconVal && <Image src={faviconVal} alt="Favicon preview" width={24} height={24} className="h-6 w-6 rounded border border-border mt-1 object-contain" />}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <ColorField
                      label="Primary color"
                      value={field.value ?? "#0b1220"}
                      onChange={(v) => field.onChange(v)}
                      error={form.formState.errors.primaryColor?.message}
                    />
                    <FormMessage className="hidden" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secondaryColor"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <ColorField
                      label="Secondary color"
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v)}
                      error={form.formState.errors.secondaryColor?.message}
                    />
                    <FormMessage className="hidden" />
                  </FormItem>
                )}
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

            <OrgSettingsFormActions onCancel={handleCancel} isPending={isPending}>
              <LoadingButton type="submit" isPending={isPending} size="sm" className="gap-1.5" loadingText="Saving…">
                Save branding
              </LoadingButton>
            </OrgSettingsFormActions>
          </form>
        </Form>
      )}
    </OrgSettingsCard>
  );
}
