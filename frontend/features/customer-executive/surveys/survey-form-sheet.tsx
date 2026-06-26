"use client";

import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCsatSurvey } from "@/lib/api/hooks/crm";
import { toast } from "sonner";

interface CreateSurveySheetProps {
  open: boolean;
  onClose: () => void;
}

export function CreateSurveySheet({ open, onClose }: CreateSurveySheetProps) {
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState(
    "How satisfied are you with our service?"
  );
  const [scaleMax, setScaleMax] = useState<"5" | "10">("5");

  const create = useCreateCsatSurvey();

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value),
    []
  );

  const handleQuestionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setQuestion(e.target.value),
    []
  );

  const handleScaleChange = useCallback(
    (v: string) => setScaleMax(v as "5" | "10"),
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        question: question.trim() || undefined,
        scaleMax: Number(scaleMax) as 5 | 10,
      });
      toast.success("Survey created");
      setTitle("");
      setQuestion("How satisfied are you with our service?");
      setScaleMax("5");
      onClose();
    } catch {
      toast.error("Failed to create survey");
    }
  }, [title, question, scaleMax, create, onClose]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-base">New CSAT Survey</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="csat-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="csat-title"
              placeholder="e.g. Q2 2026 Client Satisfaction"
              value={title}
              onChange={handleTitleChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="csat-question">Survey Question</Label>
            <Textarea
              id="csat-question"
              rows={3}
              value={question}
              onChange={handleQuestionChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="csat-scale">Rating Scale</Label>
            <Select value={scaleMax} onValueChange={handleScaleChange}>
              <SelectTrigger id="csat-scale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">1 – 5 (default)</SelectItem>
                <SelectItem value="10">1 – 10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t flex flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="flex-1"
          >
            {create.isPending ? "Creating…" : "Create Survey"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
