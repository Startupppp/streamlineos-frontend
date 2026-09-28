export interface Release {
  id: number;
  projectId: number;
  name: string;
  version: string;
  rowVersion: number;
  description: string | null;
  status: "draft" | "released" | "archived";
  releaseDate: string | null;
  ticketCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReleaseInput {
  name: string;
  version: string;
  description?: string | null;
  status?: "draft" | "released" | "archived";
  releaseDate?: string | null;
}

export interface UpdateReleaseInput {
  releaseId: number;
  rowVersion: number;
  name?: string;
  version?: string;
  description?: string | null;
  status?: "draft" | "released" | "archived";
  releaseDate?: string | null;
}
