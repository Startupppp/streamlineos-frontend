"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Twitter, Linkedin, Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonsProps {
  title: string;

  url: string;
  className?: string;
}

export function ShareButtons({ title, url, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const absoluteUrl =
    typeof window !== "undefined" && url.startsWith("/")
      ? `${window.location.origin}${url}`
      : url;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(absoluteUrl)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(absoluteUrl)}`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="mr-1 text-sm text-muted-foreground">Share</span>
      <ShareLink href={x} label="Share on X">
        <Twitter className="size-4" />
      </ShareLink>
      <ShareLink href={linkedin} label="Share on LinkedIn">
        <Linkedin className="size-4" />
      </ShareLink>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy link"
        className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        {copied ? <Check className="size-4 text-primary" /> : <Link2 className="size-4" />}
      </button>
    </div>
  );
}

function ShareLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      {children}
    </a>
  );
}
