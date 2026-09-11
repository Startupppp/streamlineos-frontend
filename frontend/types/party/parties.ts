import type { z } from "zod";
import type { partyRowContract } from "@/hooks/api/party/party-schema";

export type PartyType = "CUSTOMER" | "VENDOR" | "PARTNER" | "BOTH";

export type BusinessParty = z.infer<typeof partyRowContract>;

export interface PartiesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PartiesPage {
  data: BusinessParty[];
  pagination: PartiesPagination;
}

export interface CreatePartyInput {
  name: string;
  partyType?: PartyType;
  legalName?: string;
  displayName?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
}

export interface UpdatePartyInput {
  name?: string;
  partyType?: PartyType;
  legalName?: string | null;
  displayName?: string | null;
  taxNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
  status?: string;
}

