"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { uploadDocument } from "@/server/actions/document-actions";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import {
  formSchema, type DocumentFormData, DocumentFormFields,
} from "./_components/document-form-fields";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  documentTypes: { value: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  categories: string[];
  isAdmin: boolean;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onSuccess,
  documentTypes,
  categories,
  isAdmin,
}: UploadDocumentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const { data: employees } = useHrEmployees(undefined);

  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat && cat.trim() !== ""),
    [categories],
  );

  const filteredDocumentTypes = useMemo(
    () => documentTypes.filter((type) => type.value && type.value.trim() !== "").map(({ value, label }) => ({ value, label })),
    [documentTypes],
  );

  const filteredEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    return (employees as { id: string; firstName: string | null; lastName: string | null }[]).filter(
      (emp) => emp.id && emp.id.trim() !== "",
    );
  }, [employees]);

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "OTHER" as const,
      category: "",
      userId: "",
      isPublic: false,
      tags: [] as string[],
    },
  });

  useEffect(() => {
    if (files.length === 1) {
      form.setValue("name", files[0].name.replace(/\.[^/.]+$/, ""));
    } else if (files.length > 1) {
      form.setValue("name", `${files.length} files selected`);
    }
  }, [files, form]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    for (const f of selectedFiles) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 10MB limit`);
        continue;
      }
      validFiles.push(f);
    }
    if (validFiles.length > 0) setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const handleRemoveFileAtIndex = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const index = parseInt(e.currentTarget.dataset.index ?? "-1");
    if (index < 0) return;
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) form.setValue("name", "");
      return updated;
    });
  }, [form]);

  const handleClearAllFiles = useCallback(() => {
    setFiles([]);
    form.setValue("name", "");
  }, [form]);

  const handleTagInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      toast.error("Tag already exists");
      setTagInput("");
      return;
    }
    const newTags = [...tags, trimmed];
    setTags(newTags);
    form.setValue("tags", newTags);
    setTagInput("");
  }, [tagInput, tags, form]);

  const handleRemoveTag = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const tag = e.currentTarget.dataset.tag;
    if (!tag) return;
    setTags((prev) => {
      const updated = prev.filter((t) => t !== tag);
      form.setValue("tags", updated);
      return updated;
    });
  }, [form]);

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const uploadFileFn = useCallback(async (file: File): Promise<{ url: string; size: number; mimeType: string } | null> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "documents");
      const response = await fetch("/api/storage/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }
      const data = await response.json();
      return { url: data.url, size: file.size, mimeType: file.type };
    } catch {
      toast.error("Failed to upload file");
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const onSubmit = useCallback(async (data: DocumentFormData) => {
    if (files.length === 0) { toast.error("Please select at least one file to upload"); return; }
    if (files.length === 1 && !data.name.trim()) { toast.error("Document name is required"); return; }

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
        const uploaded = await uploadFileFn(file);
        if (!uploaded) { failCount++; continue; }
        const docName = files.length === 1 ? data.name : file.name.replace(/\.[^/.]+$/, "");
        const result = await uploadDocument({
          name: docName,
          description: data.description,
          type: data.type,
          category: data.category,
          userId: data.userId,
          isPublic: data.isPublic,
          expiryDate: data.expiryDate ? format(data.expiryDate, "yyyy-MM-dd") : undefined,
          tags: data.tags,
          fileUrl: uploaded.url,
          fileName: file.name,
          fileSize: uploaded.size,
          mimeType: uploaded.mimeType,
        });
        if (result.success) { successCount++; } else { failCount++; }
      }

      if (successCount > 0) {
        toast.success(
          files.length === 1
            ? "Document uploaded successfully"
            : `${successCount} document${successCount > 1 ? "s" : ""} uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
        );
        form.reset();
        setFiles([]);
        setTags([]);
        onSuccess();
      } else {
        toast.error("Failed to upload documents");
      }
    } catch {
      toast.error("Failed to upload documents");
    } finally {
      setIsLoading(false);
      setUploadProgress("");
    }
  }, [files, uploadFileFn, form, onSuccess]);

  const getFileIcon = (f: File) => {
    if (f.type.startsWith("image/")) return <FileText className="h-5 w-5 text-amber-500" />;
    if (f.type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
    if (f.type.includes("word")) return <FileText className="h-5 w-5 text-blue-500" />;
    if (f.type.includes("excel") || f.type.includes("spreadsheet")) return <FileText className="h-5 w-5 text-emerald-500" />;
    return <FileText className="h-5 w-5 text-slate-400" />;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-lg">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Document{files.length > 1 ? "s" : ""}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">
                {files.length > 0 ? "Add more files" : "Click or drag to upload"}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                PDF, DOC, XLS, PNG, JPG up to 10MB {files.length === 0 && "• Multiple files supported"}
              </span>
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleFileChange}
              />
            </label>

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {files.length} file{files.length > 1 ? "s" : ""} selected
                  </span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={handleClearAllFiles}>
                    Clear all
                  </Button>
                </div>
                <div className="max-h-[140px] overflow-y-auto space-y-1.5">
                  {files.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border">
                      {getFileIcon(f)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(0)} KB` : `${(f.size / (1024 * 1024)).toFixed(1)} MB`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        data-index={i}
                        onClick={handleRemoveFileAtIndex}
                        aria-label="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DocumentFormFields
              filteredDocumentTypes={filteredDocumentTypes}
              filteredCategories={filteredCategories}
              filteredEmployees={filteredEmployees}
              isAdmin={isAdmin}
              filesCount={files.length}
              tags={tags}
              tagInput={tagInput}
              onTagInputChange={handleTagInputChange}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onTagKeyDown={handleTagKeyDown}
            />

            <div className="flex justify-end gap-3 pt-6 mt-2 border-t">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || uploading || files.length === 0}>
                {isLoading || uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress || "Uploading..."}
                  </>
                ) : (
                  files.length > 1 ? `Upload ${files.length} Documents` : "Upload Document"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
