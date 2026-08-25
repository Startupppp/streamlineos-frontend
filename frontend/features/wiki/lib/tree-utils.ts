import type { KbPageTreeNode } from "@/hooks/api/kb/pages";

export function filterTreeWithAncestors(
  nodes: KbPageTreeNode[],
  predicate: (node: KbPageTreeNode) => boolean
): KbPageTreeNode[] {
  const matchIds = new Set<number>();
  for (const node of nodes) {
    if (predicate(node)) matchIds.add(node.id);
  }
  const result = new Set<number>(matchIds);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const id of matchIds) {
    let current = byId.get(id);
    while (current?.parentPageId != null) {
      result.add(current.parentPageId);
      current = byId.get(current.parentPageId);
    }
  }
  return nodes.filter((n) => result.has(n.id));
}
