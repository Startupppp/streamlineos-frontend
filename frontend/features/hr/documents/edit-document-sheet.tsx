"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { HrSheet } from "@/features/hr/hr-sheet";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { useUpdateDocument, useHrEmployees } from "@/hooks/api/hr";
import {
  formSchema,
  type DocumentFormData,
  DocumentFormFields,
} from "@/features/hr/documents/document-form-fields";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Document } from "@/types/hr";

interface EditDocumentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  documentTypes: {
    value: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
  categories: string[];
  isAdmin: boolean;
}

export function EditDocumentSheet({
  open,
  onOpenChange,
  document,
  documentTypes,
  categories,
  isAdmin,
}: EditDocumentSheetProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const { data: employees } = useHrEmployees(undefined);
  const updateDocument = useUpdateDocument();

  const filteredCategories = useMemo(
    () => categories.filter((cat) => cat && cat.trim() !== ""),
    [categories],
  );

  const filteredDocumentTypes = useMemo(
    () =>
      documentTypes
        .filter((type) => type.value && type.value.trim() !== "")
        .map(({ value, label }) => ({ value, label })),
    [documentTypes],
  );

  const filteredEmployees = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    return (
      employees as {
        id: string;
        firstName: string | null;
        lastName: string | null;
      }[]
    ).filter((emp) => emp.id && emp.id.trim() !== "");
  }, [employees]);

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      userId: "",
      isPublic: false,
      tags: [],
    },
  });

  useEffect(() => {
    if (open && document) {
      form.reset({
        name: document.name ?? "",
        description: document.description ?? "",
        type: document.type as DocumentFormData["type"],
        category: document.category ?? "",
        userId: document.userId ?? "",
        isPublic: document.isPublic ?? false,
        tags: document.tags ?? [],
      });
      setTags(document.tags ?? []);
    }
  }, [open, document, form]);

  const handleTagInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTagInput(e.target.value);
    },
    [],
  );

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

  const handleRemoveTag = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const tag = e.currentTarget.dataset.tag;
      if (!tag) return;
      setTags((prev) => {
        const updated = prev.filter((t) => t !== tag);
        form.setValue("tags", updated);
        return updated;
      });
    },
    [form],
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag],
  );

  const onSubmit = useCallback(
    async (data: DocumentFormData) => {
      if (!document) return;
      updateDocument.mutate(
        {
          id: document.id,
          name: data.name,
          description: data.description ?? null,
          type: data.type,
          category: data.category ?? null,
          userId: data.userId ?? null,
          isPublic: data.isPublic,
          tags: data.tags,
          expiryDate: data.expiryDate
            ? format(data.expiryDate, "yyyy-MM-dd")
            : null,
        },
        {
          onSuccess: () => {
            toast.success("Document updated");
            onOpenChange(false);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [document, updateDocument, onOpenChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Document"
      description="Update document metadata and assignment."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Save Changes"
      isPending={updateDocument.isPending}
    >
      <Form {...form}>
        <DocumentFormFields
          filteredDocumentTypes={filteredDocumentTypes}
          filteredCategories={filteredCategories}
          filteredEmployees={filteredEmployees}
          isAdmin={isAdmin}
          filesCount={1}
          tags={tags}
          tagInput={tagInput}
          onTagInputChange={handleTagInputChange}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onTagKeyDown={handleTagKeyDown}
        />
      </Form>
    </HrSheet>
  );
}
