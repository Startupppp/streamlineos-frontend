"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface PageBuilderCanvasProps {
  title: string;
  slug: string;
  description: string;
  content: string;
  showPreview: boolean;
  previewHtml: string;
  onTitleChange: (v: string) => void;
  onSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (v: string) => void;
  onContentChange: (v: string) => void;
}

export function PageBuilderCanvas({
  title,
  slug,
  description,
  content,
  showPreview,
  previewHtml,
  onTitleChange,
  onSlugChange,
  onDescriptionChange,
  onContentChange,
}: PageBuilderCanvasProps) {
  return (
    <div className={`grid gap-6 ${showPreview ? "lg:grid-cols-2" : "max-w-2xl"}`}>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="lp-title">
            Page Title <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="lp-title"
            placeholder="e.g. Get a Free Consultation"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lp-slug">
            URL Slug <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <div className="flex items-center rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring bg-background">
            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-r border-input shrink-0">
              /
            </span>
            <input
              id="lp-slug"
              value={slug}
              onChange={onSlugChange}
              placeholder="my-landing-page"
              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Only lowercase letters, numbers, and hyphens. Public URL:{" "}
            <code className="text-xs">/{slug || "…"}</code>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lp-desc">Sub-headline / Description</Label>
          <Input
            id="lp-desc"
            placeholder="Shown below the hero title — keep it under 160 characters"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>

        <Separator />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="lp-content">Body Content (HTML)</Label>
            <Badge variant="outline" className="text-xs">HTML</Badge>
          </div>
          <Textarea
            id="lp-content"
            placeholder={`<h2>Why Choose Us?</h2>\n<p>We provide...</p>\n<ul>\n  <li>Point one</li>\n  <li>Point two</li>\n</ul>`}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={16}
            className="font-mono text-xs resize-y"
          />
          <p className="text-xs text-muted-foreground">
            HTML content rendered in the body. A contact form is automatically appended below.
          </p>
        </div>
      </div>

      {showPreview && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Live Preview</p>
            <Badge variant="secondary" className="text-xs">Approximate</Badge>
          </div>
          <div className="flex-1 border rounded-lg overflow-hidden min-h-[600px]">
            <iframe
              key={previewHtml}
              srcDoc={previewHtml}
              title="Page Preview"
              className="w-full h-full min-h-[600px]"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
