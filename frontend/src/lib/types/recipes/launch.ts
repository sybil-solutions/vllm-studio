export type LaunchStage =
  | "preempting"
  | "evicting"
  | "launching"
  | "waiting"
  | "ready"
  | "cancelled"
  | "error";

export interface LaunchProgress {
  stage: LaunchStage;
  message?: string;
  progress?: number;
}

export interface LaunchProgressData extends LaunchProgress {
  recipe_id: string;
  message: string;
}
