"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { COMMON_TOKENS } from "./template-constants";

interface TemplateTokenPickerProps {
  detectedVariables: string[];
  onInsertToken: (token: string) => void;
}

export function TemplateTokenPicker({
  detectedVariables,
  onInsertToken,
}: TemplateTokenPickerProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Variable Tokens</CardTitle>
        <CardDescription>
          Click a token to insert it at your cursor in the editor below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_TOKENS.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => onInsertToken(token)}
              className="inline-flex items-center px-2 py-1 rounded text-[11px] font-mono bg-muted hover:bg-muted/80 border border-border/60 text-foreground transition-colors cursor-pointer"
              title={`Insert {{${token}}}`}
            >
              {`{{${token}}}`}
            </button>
          ))}
        </div>

        {detectedVariables.length > 0 && (
          <>
            <Separator className="my-3" />
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
                Detected in content
              </p>
              <div className="flex flex-wrap gap-1">
                {detectedVariables.map((v) => (
                  <Badge
                    key={v}
                    variant="outline"
                    className="text-[10px] font-mono px-1.5 bg-blue/5 border-blue/20 text-blue"
                  >
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
