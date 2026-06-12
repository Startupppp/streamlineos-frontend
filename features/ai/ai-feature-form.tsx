"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAiFeatureMutation } from "./use-ai-feature-mutation";
import { getAiInputConfig } from "./ai-features";

interface AiFeatureFormProps {
  featureId: string;
  onClose: () => void;
}

export function AiFeatureForm({ featureId, onClose }: AiFeatureFormProps) {
  const [input, setInput] = useState("");
  const [secondInput, setSecondInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const { run, isPending } = useAiFeatureMutation();

  const config = getAiInputConfig(featureId);

  const handleSubmit = () => {
    if (!input.trim()) {
      toast.error("Please enter input");
      return;
    }
    run({
      featureId,
      input,
      secondInput,
      onSuccess: (data) => {
        setResult(JSON.stringify(data, null, 2));
        toast.success("AI response generated");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
      {config.type !== "none" && (
        <div className="space-y-1.5">
          <Label>{config.label}</Label>
          {config.type === "textarea" ? (
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={config.placeholder}
              rows={4}
            />
          ) : (
            <Input
              type={config.type === "number" ? "number" : "text"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={config.placeholder}
            />
          )}
        </div>
      )}

      {config.hasSecond && (
        <div className="space-y-1.5">
          <Label>{config.secondLabel}</Label>
          <Input
            value={secondInput}
            onChange={(e) => setSecondInput(e.target.value)}
            placeholder={config.secondPlaceholder}
          />
        </div>
      )}

      <Button onClick={handleSubmit} disabled={isPending} className="w-full">
        <Sparkles className="mr-2 h-4 w-4" />
        {isPending ? "Processing…" : "Run AI"}
      </Button>

      {result && (
        <div className="max-h-80 overflow-auto rounded-lg border border-border bg-muted p-4">
          <pre className="text-xs whitespace-pre-wrap break-words text-foreground">
            {result}
          </pre>
        </div>
      )}

      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={onClose}
      >
        Close
      </Button>
    </div>
  );
}
