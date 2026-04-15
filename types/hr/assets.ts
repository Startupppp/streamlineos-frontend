import { AssetStatus } from "./common";

export interface Asset {
  id: number;
  orgId: string;
  name: string;
  type: string;
  serialNumber: string | null;
  assignedTo: string | null;
  status: AssetStatus | null;
  purchaseDate: string | null;
  purchaseCost: string | null;
  location: string | null;
  notes: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface CreateAssetInput {
  name: string;
  type: string;
  status?: string;
  serialNumber?: string;
  assignedTo?: string;
  purchaseDate?: Date | string;
  purchaseCost?: number;
  location?: string;
  notes?: string;
}

export interface UpdateAssetInput {
  assetId: number;
  name?: string;
  type?: string;
  serialNumber?: string;
  assignedTo?: string;
  status?: AssetStatus;
  location?: string;
  notes?: string;
}
