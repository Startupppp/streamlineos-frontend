"use client";

import { useState, useCallback } from "react";
import { Link as LinkIcon } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { Input } from "@/components/ui/input";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TicketCombobox } from "@/features/build/shared/ticket-combobox";
import { cn } from "@/lib/utils";
import {
  getTicketDetailHref,
  parseTicketKey,
} from "@/components/shared/format-ticket-key";

export interface RelatedLinkDraft {
  url: string;
  label: string;
}

interface TicketRelatedLinksEditorProps {
  links: RelatedLinkDraft[];
  onChange: (links: RelatedLinkDraft[]) => void;
  projectId?: number | null;
  projectKey?: string | null;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function toAbsoluteAppUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}

function RemoveLinkButton({
  idx,
  linkLabel,
  linkUrl,
  onRemove,
}: {
  idx: number;
  linkLabel: string;
  linkUrl: string;
  onRemove: (idx: number) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={() => onRemove(idx)}
      aria-label={`Remove link ${linkLabel || linkUrl}`}
      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </button>
  );
}

export function TicketRelatedLinksEditor({
  links,
  onChange,
  projectId,
  projectKey,
}: TicketRelatedLinksEditorProps) {
  const { iconRef: urlPlusIconRef, hoverHandlers: urlPlusHoverHandlers } = useAnimatedIcon();
  const [urlInput, setUrlInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const searchableProjectId =
    projectId != null && projectId > 0 && projectKey ? projectId : null;
  const searchableProjectKey =
    searchableProjectId != null && projectKey ? projectKey : null;

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value);
    setUrlError(null);
  }, []);

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLabelInput(e.target.value);
  }, []);

  const handleTicketChange = useCallback(
    (value: string, label?: string) => {
      if (!value || !label || searchableProjectId == null || searchableProjectKey == null) {
        setTicketError(null);
        return;
      }
      if (links.length >= 20) {
        setTicketError("Maximum 20 links per ticket");
        return;
      }
      const keyPart = label.split(" · ")[0]?.trim() ?? "";
      const parsed = parseTicketKey(keyPart);
      if (!parsed) {
        setTicketError("Could not resolve ticket key");
        return;
      }
      const path = getTicketDetailHref(
        searchableProjectId,
        searchableProjectKey,
        parsed.ticketNumber,
      );
      const url = toAbsoluteAppUrl(path);
      if (links.some((link) => link.url === url)) {
        setTicketError("That ticket is already linked");
        return;
      }
      onChange([...links, { url, label }]);
      setTicketError(null);
    },
    [links, onChange, searchableProjectId, searchableProjectKey],
  );

  const canSearchTickets =
    searchableProjectId != null && searchableProjectKey != null;

  const handleAddUrl = useCallback(() => {
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

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddUrl();
      }
    },
    [handleAddUrl],
  );

  const handleRemove = useCallback(
    (idx: number) => {
      onChange(links.filter((_, i) => i !== idx));
    },
    [links, onChange],
  );

  return (
    <div className="space-y-2">
      {searchableProjectId !== null && searchableProjectKey !== null ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <TicketCombobox
                projectId={searchableProjectId}
                projectKey={searchableProjectKey}
                value=""
                onChange={handleTicketChange}
                placeholder="Search and select a ticket…"
                className="h-9"
              />
            </div>
          </div>
          {ticketError ? (
            <p className="text-micro text-destructive">{ticketError}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Input
            value={urlInput}
            onChange={handleUrlChange}
            onKeyDown={handleUrlKeyDown}
            placeholder={canSearchTickets ? "Or paste URL https://..." : "https://..."}
            className={cn("h-9 text-xs", urlError && "border-destructive")}
            aria-label="Related link URL"
            aria-invalid={!!urlError}
            aria-describedby={urlError ? "link-url-error" : undefined}
          />
          {urlError ? (
            <p id="link-url-error" className="mt-0.5 text-micro text-destructive">
              {urlError}
            </p>
          ) : null}
        </div>
        <Input
          value={labelInput}
          onChange={handleLabelChange}
          onKeyDown={handleUrlKeyDown}
          placeholder="Label (optional)"
          className="h-9 w-32 shrink-0 text-xs"
          aria-label="Related link label"
        />
        <button
          type="button"
          onClick={handleAddUrl}
          aria-label="Add link"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          {...urlPlusHoverHandlers}
        >
          <PlusIcon ref={urlPlusIconRef} size={14} />
        </button>
      </div>

      {links.length > 0 ? (
        <ul className="space-y-1">
          {links.map((link, idx) => (
            <li
              key={`${link.url}-${idx}`}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5"
            >
              <LinkIcon className="h-3 w-3 shrink-0 text-primary" />
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={link.url}
                className="min-w-0 flex-1 truncate text-xs text-primary hover:underline"
              >
                {link.label || link.url}
              </a>
              {link.label ? (
                <span className="min-w-0 max-w-[140px] shrink text-micro text-muted-foreground">
                  <TruncatedText text={link.url} tooltip={link.url} />
                </span>
              ) : null}
              <RemoveLinkButton
                idx={idx}
                linkLabel={link.label}
                linkUrl={link.url}
                onRemove={handleRemove}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
