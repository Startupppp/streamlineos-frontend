import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import { getErrorMessage } from "@/lib/get-error-message";
import type { UseFormReturn } from "react-hook-form";
import type { BrandingValues } from "./org-branding-schema";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

export function useOrgBrandingUpload(form: UseFormReturn<BrandingValues>) {
  const uploadMutation = useUploadFile();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "favicon") => {
      const file = e.target.files?.[0];
      if (!file) return;

      const maxBytes = field === "favicon" ? 256 * 1024 : 2 * 1024 * 1024;
      if (file.size > maxBytes) {
        toast.error(`File too large. Max ${field === "favicon" ? "256KB" : "2MB"}.`);
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Unsupported format. Use PNG, JPEG, WebP, or ICO.");
        return;
      }

      const setter = field === "logo" ? setLogoUploading : setFaviconUploading;
      setter(true);
      try {
        const result = await uploadMutation.mutateAsync({ file, folder: `org-${field}s` });
        form.setValue(field, result.key, { shouldDirty: true });
        toast.success(`${field === "logo" ? "Logo" : "Favicon"} uploaded`);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setter(false);
        if (field === "logo" && logoInputRef.current) logoInputRef.current.value = "";
        if (field === "favicon" && faviconInputRef.current) faviconInputRef.current.value = "";
      }
    },
    [uploadMutation, form],
  );

  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleUpload(e, "logo"),
    [handleUpload],
  );

  const handleFaviconUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => handleUpload(e, "favicon"),
    [handleUpload],
  );

  const handleClickLogoInput = useCallback(() => {
    logoInputRef.current?.click();
  }, []);

  const handleClickFaviconInput = useCallback(() => {
    faviconInputRef.current?.click();
  }, []);

  return {
    logoInputRef,
    faviconInputRef,
    logoUploading,
    faviconUploading,
    handleLogoUpload,
    handleFaviconUpload,
    handleClickLogoInput,
    handleClickFaviconInput,
  };
}
