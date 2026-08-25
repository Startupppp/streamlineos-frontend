"use client";

import dynamicImport from "next/dynamic";

const PublicPageContent = dynamicImport(
  () => import("@/features/wiki/components/public-page-content"),
  { ssr: false },
);

interface PublicPageContentLoaderProps {
  content: Record<string, unknown> | Record<string, unknown>[] | null;
}

export function PublicPageContentLoader({ content }: PublicPageContentLoaderProps) {
  return <PublicPageContent content={content} />;
}
