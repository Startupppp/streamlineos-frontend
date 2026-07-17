"use client";

import { useState, useCallback } from "react";
import { Link as LinkIcon } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface RelatedLinkDraft {
  url: string;
  label: string;
}

interface TicketRelatedLinksEditorProps {
  links: RelatedLinkDraft[];
  onChange: (links: RelatedLinkDraft[]) => void;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function RemoveLinkButton({ idx, linkLabel, linkUrl, onRemove }: { idx: number; linkLabel: string; linkUrl: string; onRemove: (idx: number) => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={() => onRemove(idx)}
      aria-label={`Remove link ${linkLabel || linkUrl}`}
      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </button>
  );
}

export function TicketRelatedLinksEditor({ links, onChange }: TicketRelatedLinksEditorProps) {
  const { iconRef: plusIconRef, hoverHandlers: plusHoverHandlers } = useAnimatedIcon();
  const [urlInput, setUrlInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value);
    setUrlError(null);
  }, []);

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLabelInput(e.target.value);
  }, []);

  const handleAdd = useCallback(() => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;
    if (!isValidUrl(trimmedUrl)) {
      setUrlError("Enter a valid URL (must start with http:// or https://)");
      return;
    }
    if (links.length >= 20) {
      setUrlError("Maximum 20 links per ticket");
      return;
    }
    onChange([...links, { url: trimmedUrl, label: labelInput.trim() }]);
    setUrlInput("");
    setLabelInput("");
    setUrlError(null);
  }, [urlInput, labelInput, links, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const handleRemove = useCallback(
    (idx: number) => {
      onChange(links.filter((_, i) => i !== idx));
    },
    [links, onChange],
  );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <Input
            value={urlInput}
            onChange={handleUrlChange}
            onKeyDown={handleKeyDown}
            placeholder="https://..."
            className={cn("text-xs", urlError && "border-destructive")}
            aria-label="Related link URL"
            aria-invalid={!!urlError}
            aria-describedby={urlError ? "link-url-error" : undefined}
          />
          {urlError && (
            <p id="link-url-error" className="mt-0.5 text-[10px] text-destructive">{urlError}</p>
          )}
        </div>
        <Input
          value={labelInput}
          onChange={handleLabelChange}
          onKeyDown={handleKeyDown}
          placeholder="Label (optional)"
          className="text-xs w-32 shrink-0"
          aria-label="Related link label"
        />
        <button
          type="button"
          onClick={handleAdd}
          aria-label="Add link"
          className="flex items-center justify-center h-7 w-7 rounded-md border border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors shrink-0"
          {...plusHoverHandlers}
        >
          <PlusIcon ref={plusIconRef} size={14} />
        </button>
      </div>

      {links.length > 0 && (
        <ul className="space-y-1">
          {links.map((link, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5"
            >
              <LinkIcon className="h-3 w-3 text-primary shrink-0" />
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline truncate flex-1 min-w-0"
              >
                {link.label || link.url}
              </a>
              {link.label && (
                <span className="max-w-[80px] min-w-0 truncate text-[10px] text-muted-foreground" title={link.url}>
                  {link.url}
                </span>
              )}
              <RemoveLinkButton idx={idx} linkLabel={link.label} linkUrl={link.url} onRemove={handleRemove} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
