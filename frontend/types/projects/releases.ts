export interface ReleaseCreatedByUser {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface Release {
  id: number;
  projectId: number;
  name: string;
  version: string;
  rowVersion: number;
  description: string | null;
  status: "draft" | "released" | "archived";
  releaseDate: string | null;
  publishedAt: string | null;
  ticketCount: number;
  createdBy: string | null;
  createdByUser: ReleaseCreatedByUser | null;
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
