export interface DashboardStats {
  orgName: string;
  orgSlug: string;
  totalEmployees: number | null;
  activeProjects: number | null;
  presentToday: number | null;
}
