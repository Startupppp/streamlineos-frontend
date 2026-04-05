"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { uploadOnboardingDocument } from "@/server/actions/onboarding-actions";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { CheckCircle, Upload, Loader2 } from "lucide-react";
import { FormNavButtons } from "@/components/onboarding/form-nav-buttons";
import { Button } from "@/components/ui/button";

const DOCUMENT_TYPES = [
  { type: "ID", label: "Upload ID Proof", hint: "Passport / Aadhar / License" },
  { type: "CERTIFICATE", label: "Educational Certificates", hint: "Highest Degree / Diploma" },
  { type: "CONTRACT", label: "Signed Contract", hint: "If provided offline" },
] as const;

const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp";
const FILE_HINT = "PDF, JPEG, PNG, WebP";

const REQUIRED_DOC_TYPES = new Set(["ID"]);

interface DocumentsTabProps {
  onComplete: (values?: Record<string, string | undefined>) => void;
  onBack: () => void;
  savedUploads?: Record<string, string | undefined>;
}

export function DocumentsTab({ onComplete, onBack, savedUploads }: DocumentsTabProps) {
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>(() => {
    if (!savedUploads) return {};
    const restored: Record<string, string> = {};
    for (const [k, v] of Object.entries(savedUploads)) {
      if (v) restored[k] = v;
    }
    return restored;
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const type = e.currentTarget.dataset.docType;
    const file = e.target.files?.[0];
    if (!type || !file) return;
    e.target.value = "";

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(`Only ${FILE_HINT} files are allowed.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File size must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setLoadingDoc(type);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await uploadOnboardingDocument(formData);
      if (res.success) {
        toast.success(`${type} uploaded successfully!`);
        setUploadedFiles((prev) => ({ ...prev, [type]: file.name }));
      } else {
        toast.error(res.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setLoadingDoc(null);
    }
  }, []);

  const handleSelectClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const type = e.currentTarget.dataset.docType;
    if (type) fileInputRefs.current[type]?.click();
  }, []);

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const missingRequired = DOCUMENT_TYPES.filter(
        (doc) => REQUIRED_DOC_TYPES.has(doc.type) && !uploadedFiles[doc.type],
      );
      if (missingRequired.length > 0) {
        setValidationError(
          `Please upload required document${missingRequired.length > 1 ? "s" : ""}: ${missingRequired.map((d) => d.label).join(", ")}`,
        );
        return;
      }
      setValidationError(null);
      onComplete({ ...uploadedFiles });
    },
    [uploadedFiles, onComplete],
  );

  return (
    <Card className="shadow-soft border-border">
      <CardContent className="pt-6">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="mb-5">
            <h2 className="text-xl font-semibold text-foreground">Documents</h2>
            <p className="text-sm text-muted-foreground mt-1">Please upload the necessary documents.</p>
          </motion.div>
          <form onSubmit={handleFormSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-live="polite">
              {DOCUMENT_TYPES.map((doc) => {
                const isUploaded = !!uploadedFiles[doc.type];
                const isThisLoading = loadingDoc === doc.type;
                const isRequired = REQUIRED_DOC_TYPES.has(doc.type);
                return (
                  <motion.div
                    key={doc.type}
                    variants={fadeUp}
                    className={`border border-dashed rounded-lg p-5 flex flex-col items-center text-center space-y-2 transition ${
                      isUploaded ? "border-emerald-500/50 bg-emerald-500/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {isUploaded ? (
                      <CheckCircle className="h-7 w-7 text-emerald-500" aria-hidden="true" />
                    ) : isThisLoading ? (
                      <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                    )}
                    <Label htmlFor={`${doc.type}-upload`} className="font-medium text-sm cursor-pointer">
                      {doc.label}
                      {isRequired && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <span className="text-xs text-muted-foreground">{doc.hint}</span>
                    <span className="text-xs text-muted-foreground/60">Max {MAX_FILE_SIZE_MB}MB · {FILE_HINT}</span>
                    {uploadedFiles[doc.type] && (
                      <span className="text-xs text-emerald-600 font-medium truncate max-w-full">{uploadedFiles[doc.type]}</span>
                    )}
                    <input
                      ref={(el) => { fileInputRefs.current[doc.type] = el; }}
                      id={`${doc.type}-upload`}
                      type="file"
                      accept={ALLOWED_EXTENSIONS}
                      data-doc-type={doc.type}
                      className="sr-only"
                      aria-label={`${doc.label}, ${doc.hint}`}
                      aria-required={isRequired}
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-doc-type={doc.type}
                      onClick={handleSelectClick}
                      disabled={isThisLoading}
                    >
                      {isUploaded ? "Replace File" : "Select File"}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
            {validationError && (
              <motion.p variants={fadeUp} role="alert" className="text-sm text-destructive mt-4">
                {validationError}
              </motion.p>
            )}
            <motion.div variants={fadeUp} className="mt-5">
              <FormNavButtons onBack={onBack} isLoading={loadingDoc !== null} submitLabel="Continue to Review" />
            </motion.div>
          </form>
        </motion.div>
      </CardContent>
    </Card>
  );
}
