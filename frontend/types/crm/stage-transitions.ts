/**
 * One move a deal made through the pipeline, and what moved it.
 *
 * The actor is a discriminated union in the database — a human row carries a user
 * and a system row carries a label, held by a CHECK constraint — so a reader can
 * always say whether a person or the platform advanced the deal.
 */
export interface DealStageTransition {
  dealStageTransitionId: string;
  fromStage: string | null;
  toStage: string;
  actorKind: "human" | "system";
  actorLabel: string | null;
  actorName: string | null;
  reason: string | null;
  occurredAt: string;
}
