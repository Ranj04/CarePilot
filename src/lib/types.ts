export type NodeKind =
  | "Patient"
  | "Symptom"
  | "Condition"
  | "Medication"
  | "MoodEntry"
  | "Session"
  | "Allergy";

export type EdgeRel =
  | "TAKES"
  | "HAS_CONDITION"
  | "REPORTED"
  | "MAY_CAUSE"
  | "TREATS"
  | "SUGGESTS"
  | "RECORDED_IN"
  | "INTERACTS_WITH"
  | "ALLERGIC_TO"
  | "CONTRAINDICATES";

export interface MemoryNode {
  nodeId: string;
  kind: NodeKind;
  label: string;
  text: string;
  data?: Record<string, unknown>;
}

export interface RecalledChunk {
  memoryId: string;
  kind: string;
  label: string;
  content: string;
  score: number;
}

export interface GraphRelation {
  subject: string;
  predicate: string;
  object: string;
}

export interface MemoryEvent {
  kind: NodeKind;
  label: string;
  text: string;
  data?: Record<string, unknown>;
  relations?: Array<{ rel: EdgeRel; toLabel: string }>;
}
