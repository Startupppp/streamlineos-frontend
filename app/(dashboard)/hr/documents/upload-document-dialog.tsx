"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  CalendarIcon,
  Upload,
  FileText,
  X,
  Loader2,
  Tags,
  Shield,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { uploadDocument } from "@/server/actions/document-actions";
import { api } from "@/trpc/react";

const formSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER"]),
  category: z.string().optional(),
  userId: z.string().optional(),
  isPublic: z.boolean(),
  expiryDate: z.date().optional(),
  tags: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

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

  const { data: employees } = api.hr.getEmployees.useQuery(undefined, {
    enabled: isAdmin,
  });

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => cat && cat.trim() !== "");
  }, [categories]);

  const filteredDocumentTypes = useMemo(() => {
    return documentTypes.filter((type) => type.value && type.value.trim() !== "");
  }, [documentTypes]);

  const filteredEmployees = useMemo(() => {
    return employees?.filter((emp) => emp.id && emp.id.trim() !== "") || [];
  }, [employees]);

  const form = useForm<FormData>({
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    for (const f of selectedFiles) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 10MB limit`);
        continue;
      }
      validFiles.push(f);
    }
    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (files.length <= 1) {
      form.setValue("name", "");
    }
  };

  const addTag = () => {
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
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    form.setValue("tags", newTags);
  };

  const uploadFileFn = async (file: File): Promise<{ url: string; size: number; mimeType: string } | null> => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "documents");

      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      return {
        url: data.url,
        size: file.size,
        mimeType: file.type,
      };
    } catch {
      toast.error("Failed to upload file");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (files.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);

        const uploaded = await uploadFileFn(file);
        if (!uploaded) {
          failCount++;
          continue;
        }

        const docName = files.length === 1
          ? data.name
          : file.name.replace(/\.[^/.]+$/, "");

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

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
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
    } catch (error) {
      toast.error("Failed to upload documents");
    } finally {
      setIsLoading(false);
      setUploadProgress("");
    }
  };

  const getFileIcon = (f: File) => {
    if (f.type.startsWith("image/")) return <FileText className="h-5 w-5 text-amber-500" />;
    if (f.type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
    if (f.type.includes("word")) return <FileText className="h-5 w-5 text-blue-500" />;
    if (f.type.includes("excel") || f.type.includes("spreadsheet")) return <FileText className="h-5 w-5 text-emerald-500" />;
    return <FileText className="h-5 w-5 text-slate-400" />;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Document{files.length > 1 ? "s" : ""}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={() => { setFiles([]); form.setValue("name", ""); }}
                  >
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
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-5">
              {files.length <= 1 && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Document Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Employment Contract 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredDocumentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isAdmin && filteredEmployees.length > 0 && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associate with Employee</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific employee</SelectItem>
                        {filteredEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Leave empty for company-wide documents
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the document..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiry Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>No expiry date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Set an expiry date for documents like contracts or certificates
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-3">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  title="Add tag"
                  aria-label="Add tag"
                >
                  <Tags className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="pl-2.5 pr-1.5 py-1 cursor-pointer hover:bg-muted"
                      onClick={() => removeTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                      {field.value ? (
                        <Globe className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Shield className="h-4 w-4 text-amber-600" />
                      )}
                      {field.value ? "Public Document" : "Private Document"}
                    </FormLabel>
                    <FormDescription className="text-xs">
                      {field.value
                        ? "All employees can view this document"
                        : "Only admins and the owner can view this"}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-6 mt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || uploading || files.length === 0}
              >
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

