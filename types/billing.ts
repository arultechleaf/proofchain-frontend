import type { BlockchainTransaction, VerificationStatus } from './index';

export type PartyType = 'customer' | 'supplier' | 'both';

export interface Party {
  id: string;
  companyId: string;
  name: string;
  partyType: PartyType;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  address?: string | null;
  city?: string | null;
  openingBalance: number;
  isActive: boolean;
  createdAt: string;
}

export interface PartySummary {
  totalSales: number;
  totalPurchases: number;
  received: number;
  paid: number;
  openingBalance: number;
  balance: number;
}

export interface Item {
  id: string;
  companyId: string;
  name: string;
  sku?: string | null;
  unit: string;
  salePrice: number;
  purchasePrice: number;
  taxRate: number;
  stock: number;
  lowStockLevel: number;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  item?: Item;
  change: number;
  balanceAfter: number;
  reason: 'opening' | 'sale' | 'purchase' | 'adjustment' | 'cancelled';
  reference?: string | null;
  createdAt: string;
}

export type InvoiceType = 'sale' | 'purchase';
export type InvoiceStatus = 'issued' | 'partial' | 'paid' | 'cancelled';

export interface InvoiceLine {
  id: string;
  position: number;
  itemId?: string | null;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  type: InvoiceType;
  invoiceNumber: string;
  partyId: string;
  party?: Party;
  invoiceDate: string;
  dueDate?: string | null;
  lines: InvoiceLine[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  notes?: string | null;
  payloadHash?: string | null;
  canonicalPayload?: string | null;
  blockchainStatus: string;
  blockchainTransactionId?: string | null;
  transaction?: BlockchainTransaction | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  partyId: string;
  party?: Party;
  invoiceId?: string | null;
  invoice?: Invoice | null;
  direction: 'in' | 'out';
  amount: number;
  method: string;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface InvoiceVerification {
  invoiceId: string;
  invoiceNumber: string;
  status: VerificationStatus;
  expectedHash: string | null;
  calculatedHash: string | null;
  hashMatch: boolean;
  blockchainRecord: {
    transactionHash: string | null;
    blockNumber: number | null;
    contractAddress: string | null;
    onChainMatch: boolean;
    error?: string;
  };
  verifiedAt: string;
  blockchainMode: 'live' | 'demo';
}
