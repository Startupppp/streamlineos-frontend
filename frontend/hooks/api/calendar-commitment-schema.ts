import { z } from "zod";

export const commitmentReferenceContract = z.object({
  source: z.enum(["crm", "build", "inventory", "finance", "hr", "tasks"]),
  type: z.string(),
  recordId: z.string(),
});

export type CommitmentReference = z.infer<typeof commitmentReferenceContract>;

export interface CommitmentChainNode {
  kind: "visible";
  key: string;
  source: CommitmentReference["source"];
  title: string;
  href: string;
  ownerMembershipId: number | null;
  ownerName: string | null;
  sourceVersion: string;
  nextAction: string | null;
  risk: "healthy" | "at_risk" | "unknown";
  diagnostics: ("stale" | "version_changed" | "missing" | "cycle" | "depth_limit" | "evidence_stale")[];
  dependencies: {
    id?: string;
    version?: number;
    kind: "blocks" | "requires" | "funds" | "fulfills" | "staffs" | "restricted";
    evidence: string | null;
    target: CommitmentChainNode | { kind: "restricted"; title: "Restricted dependency" } | { kind: "unavailable"; title: "Unavailable dependency" };
  }[];
}

const placeholderContract = z.union([
  z.object({ kind: z.literal("restricted"), title: z.literal("Restricted dependency") }),
  z.object({ kind: z.literal("unavailable"), title: z.literal("Unavailable dependency") }),
]);

const chainNodeContract: z.ZodType<CommitmentChainNode> = z.lazy(() => z.object({
  kind: z.literal("visible"),
  key: z.string(),
  source: commitmentReferenceContract.shape.source,
  title: z.string(),
  href: z.string(),
  ownerMembershipId: z.number().int().positive().nullable(),
  ownerName: z.string().nullable(),
  sourceVersion: z.string(),
  nextAction: z.string().nullable(),
  risk: z.enum(["healthy", "at_risk", "unknown"]),
  diagnostics: z.array(z.enum(["stale", "version_changed", "missing", "cycle", "depth_limit", "evidence_stale"])),
  dependencies: z.array(z.object({
    id: z.uuid().optional(),
    version: z.number().int().positive().optional(),
    kind: z.enum(["blocks", "requires", "funds", "fulfills", "staffs", "restricted"]),
    evidence: z.string().nullable(),
    target: z.union([chainNodeContract, placeholderContract]),
  })),
}));

export const calendarCommitmentChainContract = z.object({
  root: chainNodeContract.nullable(),
  risk: z.enum(["healthy", "at_risk", "unknown"]),
  coverage: z.enum(["complete", "incomplete"]),
});

export type CalendarCommitmentChain = z.infer<typeof calendarCommitmentChainContract>;

export const calendarCommitmentEdgeContract = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
});

export const calendarCommitmentRemoveContract = z.object({ removed: z.boolean() });
