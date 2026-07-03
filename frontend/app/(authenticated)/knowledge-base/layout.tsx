import WikiShell from "@/features/knowledge-base/components/wiki-shell";

export default function KnowledgeBaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WikiShell>{children}</WikiShell>;
}
