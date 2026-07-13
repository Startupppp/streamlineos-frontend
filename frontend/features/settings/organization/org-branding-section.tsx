"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Upload, Palette } from "lucide-react";
import { toast } from "sonner";
import { useUpdateOrgSettings } from "@/hooks/api/organization";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import type { OrgSettings } from "@/types/organization";
import { getErrorMessage } from "@/lib/get-error-message";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const brandingSchema = z.object({
  logo: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  favicon: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  primaryColor: z.string().regex(HEX_COLOR, "Enter a 6-digit hex color (#rrggbb)").or(z.literal("")).optional(),
  secondaryColor: z.string().regex(HEX_COLOR, "Enter a 6-digit hex color (#rrggbb)").or(z.literal("")).optional(),
  loginBgUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});

type BrandingValues = z.infer<typeof brandingSchema>;

interface OrgBrandingSectionProps {
  org: OrgSettings;
  canEdit: boolean;
}

function ColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_COLOR.test(value) ? value : "#2563eb"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 rounded border cursor-pointer p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#2563eb"
          className="h-9 flex-1 font-mono text-sm"
          maxLength={7}
        />
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
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
      primaryColor: org.primaryColor ?? "#2563eb",
      secondaryColor: org.secondaryColor ?? "",
      loginBgUrl: org.loginBgUrl ?? "",
    },
  });

  const handleEdit = useCallback(() => {
    form.reset({
      logo: org.logo ?? "",
      favicon: org.favicon ?? "",
      primaryColor: org.primaryColor ?? "#2563eb",
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
  const primaryVal = form.watch("primaryColor") ?? "#2563eb";
  const secondaryVal = form.watch("secondaryColor") ?? "";

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-blue-600" />
            Branding
          </CardTitle>
          <CardDescription>Logo, favicon, colors, and email branding defaults.</CardDescription>
        </div>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1.5 h-8 text-xs">
            <Pencil className="h-3 w-3" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="pb-5">
        {!isEditing ? (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Logo</p>
              {org.logo ? (
                <Image src={org.logo} alt="Org logo" width={200} height={40} className="h-10 w-auto rounded border object-contain" />
              ) : (
                <p className="text-xs text-muted-foreground">Not set</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Favicon</p>
              {org.favicon ? (
                <Image src={org.favicon} alt="Favicon" width={32} height={32} className="h-8 w-8 rounded border object-contain" />
              ) : (
                <p className="text-xs text-muted-foreground">Not set</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Primary color</p>
              <div className="flex items-center gap-2">
                {org.primaryColor && <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: org.primaryColor }} />}
                <p className="text-sm font-mono">{org.primaryColor || "Not set"}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Secondary color</p>
              <div className="flex items-center gap-2">
                {org.secondaryColor && <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: org.secondaryColor }} />}
                <p className="text-sm font-mono">{org.secondaryColor || "Not set"}</p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Logo</Label>
                <div className="flex gap-2">
                  <Input {...form.register("logo")} placeholder="https://cdn.example.com/logo.png" className="h-9 flex-1 text-sm" />
                  <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1" disabled={logoUploading} onClick={() => logoInputRef.current?.click()}>
                    {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  </Button>
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                </div>
                {logoVal && <Image src={logoVal} alt="Logo preview" width={200} height={40} className="h-10 w-auto rounded border mt-1 object-contain" />}
                {form.formState.errors.logo && <p className="text-[11px] text-destructive">{form.formState.errors.logo.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Favicon <span className="text-muted-foreground font-normal">(max 256 KB)</span></Label>
                <div className="flex gap-2">
                  <Input {...form.register("favicon")} placeholder="https://cdn.example.com/favicon.ico" className="h-9 flex-1 text-sm" />
                  <Button type="button" variant="outline" size="sm" className="h-9 shrink-0 gap-1" disabled={faviconUploading} onClick={() => faviconInputRef.current?.click()}>
                    {faviconUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  </Button>
                  <input ref={faviconInputRef} type="file" accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg" className="hidden" onChange={handleFaviconUpload} />
                </div>
                {faviconVal && <Image src={faviconVal} alt="Favicon preview" width={32} height={32} className="h-8 w-8 rounded border mt-1 object-contain" />}
                {form.formState.errors.favicon && <p className="text-[11px] text-destructive">{form.formState.errors.favicon.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Primary color"
                value={primaryVal}
                onChange={(v) => form.setValue("primaryColor", v, { shouldDirty: true })}
                error={form.formState.errors.primaryColor?.message}
              />
              <ColorField
                label="Secondary color"
                value={secondaryVal}
                onChange={(v) => form.setValue("secondaryColor", v, { shouldDirty: true })}
                error={form.formState.errors.secondaryColor?.message}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium">Login page background URL</Label>
              <Input {...form.register("loginBgUrl")} placeholder="https://cdn.example.com/bg.jpg" className="h-9 text-sm" />
              {form.formState.errors.loginBgUrl && <p className="text-[11px] text-destructive">{form.formState.errors.loginBgUrl.message}</p>}
            </div>

            <EmailBrandingPreview
              logo={logoVal}
              primaryColor={HEX_COLOR.test(primaryVal) ? primaryVal : "#2563eb"}
              secondaryColor={HEX_COLOR.test(secondaryVal) ? secondaryVal : undefined}
            />

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={isPending} size="sm" className="gap-1.5">
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isPending ? "Saving…" : "Save branding"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function EmailBrandingPreview({
  logo,
  primaryColor,
  secondaryColor,
}: {
  logo: string;
  primaryColor: string;
  secondaryColor?: string;
}) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <p className="text-[11px] font-medium text-muted-foreground px-3 py-2 bg-muted border-b">Email template preview</p>
      <div className="p-4" style={{ backgroundColor: "var(--muted)" }}>
        <div className="max-w-sm mx-auto bg-card rounded-lg overflow-hidden shadow-sm border border-border">
          <div className="px-6 py-4" style={{ backgroundColor: primaryColor }}>
            {logo ? (
              <Image src={logo} alt="Logo" width={200} height={32} className="h-8 w-auto object-contain brightness-0 invert" />
            ) : (
              <div className="h-8 w-24 rounded bg-white/30" />
            )}
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="h-5 w-3/4 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted/60" />
            <div className="h-3 w-5/6 rounded bg-muted/60" />
            <div
              className="mt-4 inline-block px-4 py-2 rounded text-white text-xs font-medium"
              style={{ backgroundColor: secondaryColor ?? primaryColor }}
            >
              Action button
            </div>
          </div>
          <div className="px-6 py-3 border-t text-[10px] text-muted-foreground">
            © 2026 · StreamlineOS
          </div>
        </div>
      </div>
    </div>
  );
}
