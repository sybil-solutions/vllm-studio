export interface Artifact {
  id: string;
  type: "html" | "react" | "javascript" | "python" | "mermaid" | "svg";
  title: string;
  code: string;
  output?: string;
  error?: string;
  isRunning?: boolean;
  groupId?: string;
  version?: number;
  // For database storage
  session_id?: string;
  message_id?: string;
  created_at?: string;
}

export type ArtifactType = Artifact["type"];
