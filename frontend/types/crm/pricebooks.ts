export interface Pricebook {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PricebookEntry {
  id: string;
  pricebookId: string;
  productId: number;
  unitPriceCents: number;
  minQuantity: number;
  productName: string | null;
  productSku: string | null;
  productCurrency: string | null;
}

export interface QuoteSettings {
  maxDiscountPercent: number | null;
  requirePricebookPrice: boolean;
  defaultExpiryDays: number;
  allowPriceOverride: boolean;
}

export interface QuoteTemplate {
  id: string;
  orgId: string;
  name: string;
  isDefault: boolean;
  branding: Record<string, unknown> | null;
  terms: string | null;
  createdAt: string;
  updatedAt: string;
}

