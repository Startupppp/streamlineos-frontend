"use client";

import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import {
  PageDocumentSkeleton,
  PageFileSkeleton,
  PageSpreadsheetSkeleton,
} from "./page-document-skeleton";

export function WikiFileRouteSkeleton() {
  const params = useParams();
  const pageId = Number(params.pageId);
  const queryClient = useQueryClient();
  const cached =
    Number.isInteger(pageId) && pageId > 0
      ? queryClient.getQueryData<{ kind?: string }>(
          knowledgeAndSurveysQueryKeys.kb.page(pageId),
        )
      : undefined;

  if (cached?.kind === "spreadsheet") return <PageSpreadsheetSkeleton />;
  if (cached?.kind === "file") return <PageFileSkeleton />;
  return <PageDocumentSkeleton />;
}
