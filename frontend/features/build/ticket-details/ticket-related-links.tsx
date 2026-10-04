"use client";

import Link from "next/link";
import { ExternalLink, Link2 } from "lucide-react";
import { useTicketRelatedLinks } from "@/hooks/api/build/ticket-related-links";

interface TicketRelatedLinksProps {
  projectId: number;
  ticketId: number;
}

type Target =
  | { kind: "internal"; href: string }
  | { kind: "external"; href: string }
  | null;

export function resolveLinkTarget(url: string, origin: string): Target {
  if (/[\p{Cc}\\]/u.test(url) || url.startsWith("//")) return null;
  const relative = url.startsWith("/");
  let parsed: URL;
  try {
    parsed = new URL(url, relative ? origin || "http://local.invalid" : undefined);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (relative || parsed.origin === origin) {
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//"))
      return null;
    return {
      kind: "internal",
      href: `${parsed.pathname}${parsed.search}${parsed.hash}`,
    };
  }
  return { kind: "external", href: parsed.href };
}

export function TicketRelatedLinks({
  projectId,
  ticketId,
}: TicketRelatedLinksProps) {
  const { data: links } = useTicketRelatedLinks(projectId, ticketId);
  if (!links || links.length === 0) return null;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div>
      <span className="text-micro text-muted-foreground font-medium uppercase tracking-wide block mb-1.5">
        Links
      </span>
      <ul className="space-y-1">
        {links.map((link) => {
          const label = link.title || link.url;
          const target = resolveLinkTarget(link.url, origin);
          const className =
            "flex items-center gap-1.5 text-dense text-foreground hover:text-accent truncate";
          return (
            <li key={link.id} className="min-w-0">
              {target?.kind === "internal" ? (
                <Link href={target.href} className={className} title={link.url}>
                  <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{label}</span>
                </Link>
              ) : target?.kind === "external" ? (
                <a
                  href={target.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                  title={link.url}
                >
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{label}</span>
                </a>
              ) : (
                <span
                  className="text-dense text-muted-foreground truncate block"
                  title={link.url}
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
