"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Upload, FileText, FileSpreadsheet, FileImage, File } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HrSheet } from "@/components/shared/hr-sheet";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCreateDocument, useHrEmployeeOptions } from "@/hooks/api/hr";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import {
  formSchema, type DocumentFormData, DocumentFormFields,
} from "@/features/hr/documents/document-form-fields";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  documentTypes: { value: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  categories: string[];
  canAssignEmployee: boolean;
}

function getFileTypeConfig(file: File): { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; badge: string } {
  if (file.type === "application/pdf") {
    return { icon: FileText, bg: "bg-status-danger-surface", text: "text-status-danger-ink", badge: "PDF" };
  }
  if (file.type.includes("word") || file.name.endsWith(".doc") || file.name.endsWith(".docx")) {
    return { icon: FileText, bg: "bg-status-info-surface", text: "text-status-info-ink", badge: "DOC" };
  }
  if (file.type.includes("excel") || file.type.includes("spreadsheet") || file.name.endsWith(".xls") || file.name.endsWith(".xlsx") || file.name.endsWith(".csv")) {
    return { icon: FileSpreadsheet, bg: "bg-status-success-surface", text: "text-status-success-ink", badge: "XLS" };
  }
  if (file.type.startsWith("image/")) {
    return { icon: FileImage, bg: "bg-status-warning-surface", text: "text-status-warning-ink", badge: "IMG" };
  }
  return { icon: File, bg: "bg-muted", text: "text-muted-foreground", badge: "FILE" };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function RemoveFileButton({
  index,
  onClick,
}: {
  index: number;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
      data-index={index}
      onClick={onClick}
      aria-label="Remove file"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={12} />
    </Button>
  );
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onSuccess,
  documentTypes,
  categories,
  canAssignEmployee,
}: UploadDocumentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const titleAutoPopulated = useRef(false);

  const debouncedEmployeeSearch = useDebouncedValue(employeeSearch, 300);
  const { employees, isFetching: employeesLoading } = useHrEmployeeOptions({
    limit: 20,
    search: debouncedEmployeeSearch || undefined,
    enabled: open && canAssignEmployee,
  });
  const createDocumentMutation = useCreateDocument();
  const uploadFileMutation = useUploadFile();

  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat && cat.trim() !== ""),
    [categories],
  );

  const filteredDocumentTypes = useMemo(
    () => documentTypes
      .filter((type) => type.value && type.value.trim() !== "")
      .map(({ value, label }) => ({ value, label })),
    [documentTypes],
  );

  const filteredEmployees = useMemo(
    () => employees.filter((emp) => emp.id && emp.id.trim() !== ""),
    [employees],
  );

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      userId: "",
      isPublic: false,
      tags: [] as string[],
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setFiles([]);
      setTags([]);
      setTagInput("");
      setEmployeeSearch("");
      titleAutoPopulated.current = false;
    }
  }, [open, form]);

  useEffect(() => {
    const currentName = form.getValues("name");
    if (files.length === 1 && (!currentName || titleAutoPopulated.current)) {
      form.setValue("name", files[0].name.replace(/\.[^/.]+$/, ""));
      titleAutoPopulated.current = true;
    } else if (files.length > 1 && (!currentName || titleAutoPopulated.current)) {
      form.setValue("name", `${files.length} files selected`);
      titleAutoPopulated.current = true;
    }
  }, [files, form]);

  const addValidFiles = useCallback((incoming: File[]) => {
    const valid: File[] = [];
    for (const f of incoming) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 10MB limit`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length > 0) setFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addValidFiles(Array.from(e.target.files ?? []));
  }, [addValidFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    addValidFiles(Array.from(e.dataTransfer.files));
  }, [addValidFiles]);

  const handleRemoveFileAtIndex = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const index = parseInt(e.currentTarget.dataset.index ?? "-1");
    if (index < 0) return;
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0 && titleAutoPopulated.current) {
        form.setValue("name", "");
        titleAutoPopulated.current = false;
      }
      return updated;
    });
  }, [form]);

  const handleClearAllFiles = useCallback(() => {
    setFiles([]);
    if (titleAutoPopulated.current) {
      form.setValue("name", "");
      titleAutoPopulated.current = false;
    }
  }, [form]);

  const handleTagInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.includes(trimmed)) { toast.error("Tag already exists"); setTagInput(""); return; }
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
    if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
  }, [handleAddTag]);

  const handleNameManualChange = useCallback(() => {
    titleAutoPopulated.current = false;
  }, []);

  const uploadFileFn = useCallback(
    async (file: File): Promise<{ key: string; size: number; mimeType: string } | null> => {
      try {
        setUploading(true);
        const result = await uploadFileMutation.mutateAsync({ file, folder: "hr-documents" });
        return { key: result.key, size: result.size, mimeType: result.mimeType };
      } catch (error) {
        toast.error(getErrorMessage(error));
        return null;
      } finally {
        setUploading(false);
      }
    },
    [uploadFileMutation],
  );

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
        try {
          await createDocumentMutation.mutateAsync({
            name: docName,
            description: data.description,
            type: data.type,
            category: data.category,
            userId: data.userId,
            isPublic: data.isPublic,
            expiryDate: data.expiryDate ? format(data.expiryDate, "yyyy-MM-dd") : undefined,
            tags: data.tags,
            fileUrl: uploaded.key,
            fileName: file.name,
            fileSize: uploaded.size,
            mimeType: uploaded.mimeType,
          });
          successCount++;
        } catch { failCount++; }
      }

      if (successCount > 0) {
        toast.success(
          files.length === 1
            ? "Document uploaded successfully"
            : `${successCount} document${successCount > 1 ? "s" : ""} uploaded${failCount > 0 ? `, ${failCount} failed` : ""}`,
        );
        form.reset();
        setFiles([]);
        setTags([]);
        titleAutoPopulated.current = false;
        onSuccess();
      } else {
        toast.error("Failed to upload documents");
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setUploadProgress("");
    }
  }, [files, uploadFileFn, form, onSuccess, createDocumentMutation]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Upload Document${files.length > 1 ? "s" : ""}`}
      description="Upload files to the HR document library."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel={
        isLoading || uploading
          ? uploadProgress || "Uploading..."
          : files.length > 1
            ? `Upload ${files.length} Documents`
            : "Upload Document"
      }
      isPending={isLoading || uploading}
      submitDisabled={files.length === 0}
    >
      <Form {...form}>
        <div className="space-y-4">
          <label
            className={cn(
              "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors duration-200",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/30",
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              {files.length > 0 ? "Add more files" : "Drop files here or click to browse"}
            </span>
            <span className="text-dense text-muted-foreground mt-1">
              PDF, DOC, XLS, PNG, JPG — up to 10MB each
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
                <span className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-dense text-muted-foreground hover:text-foreground"
                  onClick={handleClearAllFiles}
                >
                  Clear all
                </Button>
              </div>
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-1.5 pr-0.5">
                {files.map((f, i) => {
                  const config = getFileTypeConfig(f);
                  const IconComp = config.icon;
                  return (
                    <div
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-background"
                    >
                      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                        <IconComp className={cn("h-3.5 w-3.5", config.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{f.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn(
                            "inline-flex items-center text-micro font-semibold px-1.5 py-0 rounded-full border",
                            config.bg,
                            config.text,
                            "border-current/20",
                          )}>
                            {config.badge}
                          </span>
                          <span className="text-micro text-muted-foreground">{formatBytes(f.size)}</span>
                        </div>
                      </div>
                      <RemoveFileButton index={i} onClick={handleRemoveFileAtIndex} />
                    </div>
                  );
                })}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <DocumentFormFields
              filteredDocumentTypes={filteredDocumentTypes}
              filteredCategories={filteredCategories}
              filteredEmployees={filteredEmployees}
              canAssignEmployee={canAssignEmployee}
              onEmployeeSearchChange={setEmployeeSearch}
              employeesLoading={employeesLoading}
              filesCount={files.length}
              tags={tags}
              tagInput={tagInput}
              onTagInputChange={handleTagInputChange}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onTagKeyDown={handleTagKeyDown}
              onNameChange={handleNameManualChange}
            />
          </div>
        </div>
      </Form>
    </HrSheet>
  );
}
