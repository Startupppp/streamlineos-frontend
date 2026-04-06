import { cached, invalidateCache, CACHE_TTL } from "./cache";

export const HR_CACHE = {
  analytics: (orgId: string) => `hr:analytics:${orgId}`,
  recruitmentStats: (orgId: string) => `hr:recruitment:stats:${orgId}`,
  celebrations: (orgId: string) => `hr:celebrations:${orgId}`,
  attrition: (orgId: string) => `hr:attrition:${orgId}`,
  compensation: (orgId: string) => `hr:compensation:${orgId}`,
  compliance: (orgId: string) => `hr:compliance:${orgId}`,
  heatmap: (orgId: string, userId: string, year: number) => `hr:heatmap:${orgId}:${userId}:${year}`,
} as const;

export { cached, invalidateCache, CACHE_TTL };
