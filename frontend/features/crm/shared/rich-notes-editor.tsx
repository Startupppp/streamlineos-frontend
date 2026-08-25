"use client";

import { useState, useRef, useCallback } from "react";
import { Bold, Italic, List, Eye, EyeOff, Hash } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RichNotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  placeholder?: string;
  isSaving?: boolean;
  className?: string;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^## (.*?)$/gm, "<h3 style='font-weight:600;font-size:1rem;margin-top:0.5rem'>$1</h3>")
    .replace(/^- (.*?)$/gm, "<li style='margin-left:1rem;list-style:disc'>$1</li>")
    .replace(/\n/g, "<br>");
}

export function RichNotesEditor({
  value,
  onChange,
  onSave,
  placeholder,
  isSaving,
  className,
}: RichNotesEditorProps) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertMarkdown(prefix: string, suffix = "") {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(next);
    setTimeout(() => {
      el.setSelectionRange(start + prefix.length, end + prefix.length);
      el.focus();
    }, 0);
  }

  function handleBold() {
    insertMarkdown("**", "**");
  }

  function handleItalic() {
    insertMarkdown("*", "*");
  }

  function handleList() {
    insertMarkdown("\n- ");
  }

  function handleHeading() {
    insertMarkdown("\n## ");
  }

  function handlePreviewToggle() {
    setPreview((p) => !p);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      onSave?.(value);
    }
  }

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <button type="button" title="Bold" onClick={handleBold} className="p-1 h-7 w-7 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Italic" onClick={handleItalic} className="p-1 h-7 w-7 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="Heading" onClick={handleHeading} className="p-1 h-7 w-7 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Hash className="h-3.5 w-3.5" />
          </button>
          <button type="button" title="List" onClick={handleList} className="p-1 h-7 w-7 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          {!isSaving && value && (
            <span className="text-xs text-status-success-ink">Saved</span>
          )}
          <button
            type="button"
            onClick={handlePreviewToggle}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {preview ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
      </div>

      {preview ? (
        <div
          className="min-h-[100px] p-3 text-sm border rounded-lg bg-muted/30"
          dangerouslySetInnerHTML={{
            __html:
              renderMarkdown(value) ||
              `<span style="color:var(--muted-foreground)">${placeholder ?? "Nothing to preview"}</span>`,
          }}
        />
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          placeholder={
            placeholder ??
            "Add notes... (supports **bold**, *italic*, ## headings, - lists)"
          }
          className="min-h-[100px] text-sm font-mono resize-none"
          onKeyDown={handleKeyDown}
        />
      )}

      <p className="text-xs text-muted-foreground text-right">
        {value.length} chars · Ctrl+S to save
      </p>
    </div>
  );
}
