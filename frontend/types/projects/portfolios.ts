export type ProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type PortfolioStatus = "active" | "on_hold" | "completed" | "archived";
export type PortfolioHealth = "on_track" | "at_risk" | "off_track";

export interface CursorPagination {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CursorPage<T> {
  data: T[];
  pagination: CursorPagination;
}

export interface Portfolio {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  ownerId: string | null;
  status: PortfolioStatus;
  health: PortfolioHealth | null;
  strategicGoal: string | null;
  createdBy: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
}

export type PortfoliosPage = CursorPage<Portfolio>;

export interface LinkedProject {
  id: number;
  name: string;
  key: string;
  status: ProjectStatus;
  openCount: number;
  doneCount: number;
}

export interface LinkedProgram {
  id: number;
  name: string;
  status: PortfolioStatus;
}

export interface PortfolioDetail extends Portfolio {
  projects: CursorPage<LinkedProject>;
  programs: CursorPage<LinkedProgram>;
}

export interface CreatePortfolioInput {
  name: string;
  description?: string;
  ownerId?: string;
  status: PortfolioStatus;
  health?: PortfolioHealth;
  strategicGoal?: string;
}

export interface UpdatePortfolioInput {
  name?: string;
  description?: string;
  ownerId?: string;
  status?: PortfolioStatus;
  health?: PortfolioHealth;
  strategicGoal?: string;
}

export interface Program {
  id: number;
  orgId: string;
  portfolioId: number | null;
  name: string;
  description: string | null;
  ownerId: string | null;
  status: PortfolioStatus;
  health: PortfolioHealth | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
}

export type ProgramsPage = CursorPage<Program>;

export interface CreateProgramInput {
  name: string;
  description?: string;
  portfolioId?: number;
  ownerId?: string;
  status?: PortfolioStatus;
  health?: PortfolioHealth;
}

export interface UpdateProgramInput {
  name?: string;
  description?: string | null;
  portfolioId?: number | null;
  ownerId?: string | null;
  status?: PortfolioStatus;
  health?: PortfolioHealth | null;
}
