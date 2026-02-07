export interface LogSession {
  id: string;
  recipe_id?: string;
  recipe_name?: string;
  model_path?: string;
  model?: string;
  backend?: string;
  started_at?: string;
  created_at: string;
  ended_at?: string;
  status: "running" | "stopped" | "crashed";
}

