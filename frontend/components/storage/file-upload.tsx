"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, File } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";

const storageUploadC = lazyContract(() =>
  import("@/components/storage/storage-schema").then((m) => m.storageUploadContract),
);

interface FileUploadProps {
  onUploadComplete: (key: string) => void;
  folder?: string;
  maxSize?: number;
  accept?: string;
  className?: string;
  multiple?: boolean;
}

interface UploadedFileRowProps {
  file: { key: string; name: string };
  index: number;
  onRemove: (index: number) => void;
}

function UploadedFileRow({ file, index, onRemove }: UploadedFileRowProps) {
  function handleRemove() {
    onRemove(index);
  }

  return (
    <div className="flex items-center justify-between p-2 border rounded-lg">
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <File className="h-4 w-4 shrink-0" />
        <span className="text-sm truncate">{file.name}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleRemove}
        aria-label="Remove file"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FileUpload({
  onUploadComplete,
  folder = "uploads",
  maxSize = 10 * 1024 * 1024,
  accept,
  className,
  multiple = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ key: string; name: string }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleTriggerClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (file.size > maxSize) {
          toast.error(
            `File ${file.name} is too large (max ${maxSize / 1024 / 1024}MB)`
          );
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        try {
          const result = await apiClient.upload<{ key: string }>(
            "/storage/upload",
            formData,
            storageUploadC,
          );
          setUploadedFiles((prev) => [...prev, { key: result.key, name: file.name }]);
          onUploadComplete(result.key);
        } catch (err) {
          toast.error(`Failed to upload ${file.name}: ${getErrorMessage(err)}`);
          continue;
        }
      }

      toast.success(`Successfully uploaded ${fileArray.length} file(s)`);
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTriggerClick}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept={accept}
          multiple={multiple}
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <UploadedFileRow
              key={index}
              file={file}
              index={index}
              onRemove={removeFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
