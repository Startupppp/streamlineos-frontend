import { Suspense } from "react";
import WikiShell from "@/features/knowledge-base/components/wiki-shell";

export default function KnowledgeWikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <WikiShell>{children}</WikiShell>
    </Suspense>
  );
}
