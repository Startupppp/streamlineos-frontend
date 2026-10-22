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
