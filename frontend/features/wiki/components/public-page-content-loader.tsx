"use client";

import dynamicImport from "next/dynamic";

const KbContentRenderer = dynamicImport(
  () => import("@/components/shared/kb-content-renderer"),
  { ssr: false },
);

interface PublicPageContentLoaderProps {
  content: Record<string, unknown> | Record<string, unknown>[] | null;
}

export function PublicPageContentLoader({ content }: PublicPageContentLoaderProps) {
  return <KbContentRenderer content={content} />;
}
