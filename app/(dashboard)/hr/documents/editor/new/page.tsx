"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCreateRichDocument } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, FileText, FileCheck, FileClock, FileKey, Loader2 } from "lucide-react";
import Link from "next/link";

const TEMPLATES = [
  { value: "blank", label: "Blank Document", description: "Start from scratch", icon: FileText },
  { value: "offer_letter", label: "Offer Letter", description: "Standard employment offer", icon: FileCheck },
  { value: "policy", label: "Company Policy", description: "Internal policy template", icon: FileKey },
  { value: "nda", label: "NDA", description: "Non-disclosure agreement", icon: FileClock },
  { value: "handbook", label: "Employee Handbook", description: "Company handbook section", icon: FileText },
];

const DEFAULT_CONTENT: Record<string, unknown> = {
  blank: { type: "doc", content: [{ type: "paragraph" }] },
  offer_letter: {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Offer Letter" }] },
      { type: "paragraph", content: [{ type: "text", text: "Dear [Candidate Name]," }] },
      { type: "paragraph", content: [{ type: "text", text: "We are pleased to offer you the position of [Job Title] at [Company Name]. Your start date will be [Start Date]." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Compensation" }] },
      { type: "bulletList", content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Base Salary: ₹[Amount] per annum" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Probation Period: [Duration]" }] }] },
      ]},
      { type: "paragraph", content: [{ type: "text", text: "Please confirm your acceptance by signing below." }] },
      { type: "paragraph" },
      { type: "paragraph", content: [{ type: "text", text: "Sincerely," }] },
      { type: "paragraph", content: [{ type: "text", text: "[HR Manager Name]" }] },
    ],
  },
  policy: {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Company Policy: [Policy Name]" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "1. Purpose" }] },
      { type: "paragraph", content: [{ type: "text", text: "This policy outlines..." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "2. Scope" }] },
      { type: "paragraph", content: [{ type: "text", text: "This policy applies to all employees of [Company Name]." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "3. Policy Details" }] },
      { type: "paragraph", content: [{ type: "text", text: "..." }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "4. Compliance" }] },
      { type: "paragraph", content: [{ type: "text", text: "Violations of this policy may result in disciplinary action." }] },
    ],
  },
  nda: {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Non-Disclosure Agreement" }] },
      { type: "paragraph", content: [{ type: "text", text: "This Non-Disclosure Agreement (\"Agreement\") is entered into by and between:" }] },
      { type: "paragraph", content: [{ type: "text", text: "Party A: [Company Name]" }] },
      { type: "paragraph", content: [{ type: "text", text: "Party B: [Employee/Contractor Name]" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "1. Definition of Confidential Information" }] },
      { type: "paragraph", content: [{ type: "text", text: "..." }] },
    ],
  },
  handbook: {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Employee Handbook" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Welcome" }] },
      { type: "paragraph", content: [{ type: "text", text: "Welcome to [Company Name]. This handbook provides guidelines and information about your employment." }] },
    ],
  },
};

export default function NewDocumentPage() {
  const router = useRouter();
  const createDoc = useCreateRichDocument();
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("blank");

  const handleCreate = useCallback(() => {
    const docTitle = title.trim() || `Untitled Document`;
    createDoc.mutate(
      {
        title: docTitle,
        templateType: template === "blank" ? undefined : template,
        contentJson: DEFAULT_CONTENT[template] ?? DEFAULT_CONTENT.blank,
      },
      {
        onSuccess: (doc) => {
          toast.success("Document created");
          router.push(`/hr/documents/editor/${doc.id}`);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [title, template, createDoc, router]);

  return (
    <PageWrapper
      title="Create Document"
      subtitle="Choose a template and start writing"
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/documents">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-4 lg:grid-cols-3 xl:gap-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Choose Template</CardTitle>
              <CardDescription>Select a starter template for your document.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = template === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTemplate(t.value)}
                      className={`text-left p-4 rounded-lg border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/30 bg-card"
                      }`}
                    >
                      <Icon className={`h-7 w-7 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
              <CardDescription>Give your document a title and confirm template.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="e.g. Employee Handbook 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Template</label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={createDoc.isPending} className="w-full" size="lg">
                {createDoc.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Create & Open Editor
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
