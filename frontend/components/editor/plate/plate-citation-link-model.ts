export interface CitationSourceState {
  hasSource: boolean;
  buttonLabel: "Edit source" | "Add source";
  display: string | null;
}

export function citationSourceState(
  sourceTitle: string | null,
  sourceUrl: string | null,
): CitationSourceState {
  const hasSource = sourceTitle !== null || sourceUrl !== null;
  return {
    hasSource,
    buttonLabel: hasSource ? "Edit source" : "Add source",
    display: hasSource ? (sourceTitle ?? sourceUrl) : null,
  };
}

export interface LinkPreviewMeta {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export function linkPreviewDisplayTitle(
  data: LinkPreviewMeta | undefined,
  url: string | null,
): string | null {
  return data?.title ?? url;
}

export function linkPreviewHasMeta(data: LinkPreviewMeta | undefined): boolean {
  return Boolean(data?.title || data?.description || data?.image);
}
