import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache, type CSSProperties } from "react";
import { format } from "date-fns";
import { PublicPageContentLoader } from "@/features/wiki/components/public-page-content-loader";
import { publicGetNoStore } from "@/lib/public-fetch";
import { publicWikiPageContract } from "@/lib/public-schema";
import { rewritePublicMediaUrls } from "@/features/wiki/lib/rewrite-public-media-urls";

export const dynamic = "force-dynamic";

const SHARE_TOKEN_RE = /^[A-Za-z0-9-]{8,64}$/;

const GRADIENT_PRESETS: Array<{ key: string; css: string }> = [
  { key: "slate", css: "linear-gradient(135deg, #1e293b 0%, #334155 100%)" },
  { key: "ocean", css: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)" },
  { key: "forest", css: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)" },
  { key: "sunset", css: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)" },
  { key: "rose", css: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)" },
  { key: "violet", css: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)" },
  { key: "amber", css: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" },
  { key: "dark", css: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" },
];

function getCoverStyle(coverImage: string | null): CSSProperties {
  if (!coverImage) return {};
  if (coverImage.startsWith("gradient:")) {
    const key = coverImage.slice(9);
    const preset = GRADIENT_PRESETS.find((p) => p.key === key);
    return preset ? { background: preset.css } : {};
  }
  return {
    backgroundImage: `url(${coverImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

const fetchPageData = cache(
  async (shareToken: string) =>
    publicGetNoStore(`/public/wiki/${shareToken}`, undefined, publicWikiPageContract),
);

type Props = { params: Promise<{ shareToken: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params;
  if (!SHARE_TOKEN_RE.test(shareToken)) return {};
  const data = await fetchPageData(shareToken);
  if (!data) return { title: "Page not found" };
  return {
    title: data.title,
    robots: { index: false, follow: false },
  };
}

export default async function PublicWikiPage({ params }: Props) {
  const { shareToken } = await params;

  if (!SHARE_TOKEN_RE.test(shareToken)) {
    notFound();
  }

  const data = await fetchPageData(shareToken);
  if (!data) {
    notFound();
  }

  const hasCover = !!data.coverImage;
  const coverStyle = getCoverStyle(data.coverImage);

  const r2Base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  const brokerContent = r2Base ? rewritePublicMediaUrls(data.content, shareToken, r2Base) : data.content;

  return (
    <main>
      {hasCover && (
        <div className="w-full h-40" style={coverStyle} aria-hidden="true" />
      )}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-2">
          {data.icon && (
            <span className="text-3xl leading-none" aria-hidden="true">
              {data.icon}
            </span>
          )}
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {data.title || "Untitled"}
          </h1>
        </div>
        {data.updatedAt && (
          <p className="text-xs text-muted-foreground mb-8">
            Last updated {format(new Date(data.updatedAt), "MMM d, yyyy")}
          </p>
        )}
        <PublicPageContentLoader content={brokerContent} />
      </div>
    </main>
  );
}
