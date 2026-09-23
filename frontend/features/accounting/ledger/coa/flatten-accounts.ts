import type { AccountNode } from "@/types/accounting/accounting-kernel";

export interface FlatAccount {
  node: AccountNode;
  depth: number;
}

export function flattenAccounts(
  nodes: readonly AccountNode[],
  depth = 0,
): FlatAccount[] {
  const rows: FlatAccount[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (node.children.length > 0)
      rows.push(...flattenAccounts(node.children, depth + 1));
  }
  return rows;
}

export function headerAccountOptions(
  rows: readonly FlatAccount[],
  excludeAccountId?: string,
): Array<{ value: string; label: string; sublabel?: string }> {
  return rows
    .filter((row) => row.node.isHeader && row.node.id !== excludeAccountId)
    .map((row) => ({
      value: row.node.id,
      label: `${row.node.code} · ${row.node.name}`,
      sublabel: row.depth > 0 ? "Sub-group" : "Top level",
    }));
}
