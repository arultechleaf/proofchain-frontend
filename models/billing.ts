import type { BlockchainTransaction, VerificationStatus } from './index';

export type PartyType = 'customer' | 'supplier' | 'both';

export interface Party {
  id: number;
  companyId: number;
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
  id: number;
  companyId: number;
  name: string;
  sku?: string | null;
  hsnCode?: string | null;
  unit: string;
  salePrice: number;
  purchasePrice: number;
  taxRate: number;
  stock: number;
  lowStockLevel: number;
  /** How much to order when the item runs low. */
  reorderQuantity?: number;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface StockMovement {
  id: number;
  itemId: number;
  item?: Item;
  change: number;
  balanceAfter: number;
  reason: 'opening' | 'sale' | 'purchase' | 'adjustment' | 'cancelled' | 'sale_return' | 'purchase_return' | 'transfer_in' | 'transfer_out';
  reference?: string | null;
  createdAt: string;
}

export type InvoiceType = 'sale' | 'purchase';
export type InvoiceStatus = 'issued' | 'partial' | 'paid' | 'cancelled';

export interface InvoiceLine {
  id: number;
  position: number;
  itemId?: number | null;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
  sku?: string | null;
  hsnCode?: string | null;
  unit?: string | null;
  discountType?: 'amount' | 'percent' | null;
  discountValue?: number;
  discountAmount?: number;
  taxableAmount?: number | null;
  gstAmount?: number;
  lineTotal?: number | null;
}

export interface Invoice {
  id: number;
  companyId: number;
  type: InvoiceType;
  invoiceNumber: string;
  partyId: number;
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
  paymentType?: 'cash' | 'upi' | 'bank' | 'credit' | null;
  customerMobile?: string | null;
  customerGstin?: string | null;
  billingAddress?: string | null;
  placeOfSupply?: string | null;
  /** null on invoices made before GST support. */
  taxableValue?: number | null;
  cgst?: number;
  sgst?: number;
  igst?: number;
  roundOff?: number;
  payloadHash?: string | null;
  canonicalPayload?: string | null;
  blockchainStatus: string;
  blockchainTransactionId?: number | null;
  transaction?: BlockchainTransaction | null;
  createdAt: string;
}

export interface Payment {
  id: number;
  partyId: number;
  party?: Party;
  invoiceId?: number | null;
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
  invoiceId: number;
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
