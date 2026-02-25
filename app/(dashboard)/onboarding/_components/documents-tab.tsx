"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { uploadOnboardingDocument } from "@/server/actions/onboarding-actions";
import { toast } from "sonner";
import { CheckCircle, Upload, ArrowLeft, ArrowRight } from "lucide-react";

const DOCUMENT_TYPES = [
  { type: "ID", label: "Upload ID Proof", hint: "Passport / Aadhar / License" },
  { type: "CERTIFICATE", label: "Educational Certificates", hint: "Highest Degree / Diploma" },
  { type: "CONTRACT", label: "Signed Contract", hint: "If provided offline" },
];

interface DocumentsTabProps {
  onComplete: () => void;
  onBack: () => void;
}

export function DocumentsTab({ onComplete, onBack }: DocumentsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const res = await uploadOnboardingDocument(formData);
    setIsLoading(false);
    if (res.success) {
      toast.success(`${type} uploaded successfully!`);
      setUploadedFiles((prev) => ({ ...prev, [type]: file.name }));
    } else {
      toast.error(res.error || "Upload failed");
    }
  };

  return (
    <Card className="shadow-noir border-border">
      <CardContent className="pt-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">Documents</h2>
          <p className="text-sm text-muted-foreground mt-1">Please upload the necessary documents.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DOCUMENT_TYPES.map((doc) => (
            <div
              key={doc.type}
              className={`border border-dashed rounded-lg p-6 flex flex-col items-center text-center space-y-2 transition ${
                uploadedFiles[doc.type] ? "border-green-500/50 bg-green-500/10" : "border-border hover:bg-muted/50"
              }`}
            >
              {uploadedFiles[doc.type] ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <Label htmlFor={`${doc.type}-upload`} className="font-semibold cursor-pointer">{doc.label}</Label>
              <span className="text-xs text-muted-foreground">{doc.hint}</span>
              {uploadedFiles[doc.type] && (
                <span className="text-xs text-green-600 font-medium">{uploadedFiles[doc.type]}</span>
              )}
              <Input id={`${doc.type}-upload`} type="file" className="hidden" onChange={(e) => onFileUpload(e, doc.type)} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`${doc.type}-upload`)?.click()}
                disabled={isLoading}
              >
                {uploadedFiles[doc.type] ? "Replace File" : "Select File"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onComplete}>
          Continue to Review
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
