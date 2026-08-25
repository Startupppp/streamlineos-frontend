import { Suspense } from "react";
import WikiShell from "@/features/wiki/components/wiki-shell";

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
