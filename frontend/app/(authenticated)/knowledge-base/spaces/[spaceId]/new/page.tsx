"use client";

import { useParams } from "next/navigation";
import { ArticleEditor } from "@/components/kb/article-editor";
import { ErrorState } from "@/components/shared";

export default function NewKbArticlePage() {
  const params = useParams<{ spaceId: string }>();
  const spaceId = Number(params.spaceId);

  if (!Number.isFinite(spaceId) || spaceId <= 0) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center p-6">
        <ErrorState
          title="Invalid space"
          description="This knowledge base space could not be found."
        />
      </div>
    );
  }

  return <ArticleEditor spaceId={spaceId} />;
}
