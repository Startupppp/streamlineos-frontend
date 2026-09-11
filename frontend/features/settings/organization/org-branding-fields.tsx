"use client";

import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { UploadIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { resolveImageUrl } from "@/lib/utils";
import type { OrgSettings } from "@/types/organization";
import { HEX_COLOR } from "./org-branding-schema";
import { SettingsField, SettingsFieldGrid } from "./org-settings-chrome";

interface BrandingImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className: string;
}

function BrandingImage({ src, alt, width, height, className }: BrandingImageProps) {
  if (!src) return <p className="text-sm text-muted-foreground">Not set</p>;
  return (
    <Image
      src={resolveImageUrl(src) ?? src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}

function BrandingColor({ label, color }: { label: string; color: string | null | undefined }) {
  return (
    <SettingsField label={label}>
      <div className="flex items-center gap-2">
        <ColorSwatch color={color} />
        <p className="text-sm font-mono">
          {color || <span className="text-muted-foreground font-sans">Not set</span>}
        </p>
      </div>
    </SettingsField>
  );
}

export function BrandingSummary({ org }: { org: OrgSettings }) {
  return (
    <SettingsFieldGrid cols={2}>
      <SettingsField label="Logo">
        <BrandingImage
          src={org.logo}
          alt="Org logo"
          width={160}
          height={32}
          className="h-8 w-auto rounded border border-border object-contain"
        />
      </SettingsField>
      <SettingsField label="Favicon">
        <BrandingImage
          src={org.favicon}
          alt="Favicon"
          width={24}
          height={24}
          className="h-6 w-6 rounded border border-border object-contain"
        />
      </SettingsField>
      <BrandingColor label="Primary color" color={org.primaryColor} />
      <BrandingColor label="Secondary color" color={org.secondaryColor} />
    </SettingsFieldGrid>
  );
}

function ColorSwatch({ color }: { color: string | null | undefined }) {
  if (!color) return null;
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 rounded-full border border-border"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export function ColorField({ label, value, onChange, error }: ColorFieldProps) {
  function handleColorInput(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  function handleTextInput(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={HEX_COLOR.test(value) ? value : "#0b1220"}
          onChange={handleColorInput}
          className="h-8 w-8 rounded border border-border cursor-pointer p-0.5 bg-card"
        />
        <Input
          value={value}
          onChange={handleTextInput}
          placeholder="#0b1220"
          className="flex-1 font-mono text-sm"
          maxLength={7}
        />
      </div>
      {error && <p className="text-dense text-destructive">{error}</p>}
    </div>
  );
}

export function UploadButton({ uploading, onClick }: { uploading: boolean; onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 gap-1 px-2"
      isPending={uploading}
      onClick={onClick}
      {...hoverHandlers}
    >
      {!uploading && <UploadIcon ref={iconRef} size={14} />}
    </LoadingButton>
  );
}

export function EmailBrandingPreview({
  logo,
  primaryColor,
  secondaryColor,
}: {
  logo: string;
  primaryColor: string;
  secondaryColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <p className="text-dense font-medium text-muted-foreground px-3 py-1.5 bg-muted/50 border-b border-border">
        Email template preview
      </p>
      <div className="p-3 bg-muted/30">
        <div className="max-w-sm mx-auto bg-card rounded-md overflow-hidden shadow-sm border border-border">
          <div className="px-4 py-3" style={{ backgroundColor: primaryColor }}>
            {logo ? (
              <Image
                src={resolveImageUrl(logo) ?? logo}
                alt="Logo"
                width={160}
                height={28}
                className="h-7 w-auto object-contain brightness-0 invert"
              />
            ) : (
              <div className="h-7 w-20 rounded bg-white/30" />
            )}
          </div>
          <div className="px-4 py-4 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-2.5 w-full rounded bg-muted/60" />
            <div className="h-2.5 w-5/6 rounded bg-muted/60" />
            <div
              className="mt-3 inline-block px-3 py-1.5 rounded text-white text-dense font-medium"
              style={{ backgroundColor: secondaryColor ?? primaryColor }}
            >
              Action button
            </div>
          </div>
          <div className="px-4 py-2 border-t border-border text-micro text-muted-foreground">
            © 2026 · StreamlineOS
          </div>
        </div>
      </div>
    </div>
  );
}
