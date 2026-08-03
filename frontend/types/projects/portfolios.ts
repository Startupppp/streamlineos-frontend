export type PortfolioStatus = "active" | "on_hold" | "completed" | "archived";
export type PortfolioHealth = "on_track" | "at_risk" | "off_track";

export interface Portfolio {
  id: number;
  name: string;
  description: string | null;
  ownerId: string | null;
  status: PortfolioStatus;
  health: PortfolioHealth | null;
  strategicGoal: string | null;
  createdAt: string;
  updatedAt: string;
  projectCount?: number;
}

export interface LinkedProject {
  id: number;
  name: string;
  key: string;
  status: string;
}

export interface PortfolioDetail extends Portfolio {
  projects: LinkedProject[];
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
