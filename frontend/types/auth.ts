export interface SessionData {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  deviceId: string | null;
  lastActive: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface DeviceData {
  id: string;
  userId: string;
  fingerprint: string;
  browser: string | null;
  os: string | null;
  platform: string | null;
  trusted: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  orgId: string | null;
  event: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  createdAt: string;
}

export interface ApiToken {
  id: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  description: string | null;
  scopes: string[];
  isRevoked: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface OAuthAccount {
  provider: string;
  providerAccountId: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: "global" | "percentage" | "org" | "user";
  enabled: boolean;
  rolloutPercentage: number;
  orgOverrides: Array<{ orgId: string; enabled: boolean }>;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
