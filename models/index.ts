export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'company_a' | 'company_b' | 'auditor';
  companyId: string | null;
  company?: Company;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  organizationCode: string;
  organizationType: 'sender' | 'receiver' | 'auditor';
  description?: string;
  gstin?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
export type BlockchainStatus = 'not_submitted' | 'pending' | 'confirmed' | 'failed';
export type VerificationStatus = 'verified' | 'mismatch' | 'not_found' | 'pending' | 'error';

export interface Delivery {
  id: string;
  deliveryReference: string;
  senderCompanyId: string;
  senderCompany?: Company;
  receiverCompanyId: string;
  receiverCompany?: Company;
  description: string;
  quantity: number;
  metadata?: Record<string, unknown> | null;
  payloadHash?: string | null;
  status: DeliveryStatus;
  blockchainStatus: BlockchainStatus;
  createdBy: string;
  creator?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  deliveryId: string;
  reviewerId: string;
  reviewer?: User;
  decision: 'approved' | 'rejected';
  comment?: string | null;
  createdAt: string;
}

export * from './billing';
export * from './notifications';

export interface BlockchainTransaction {
  id: string;
  deliveryId: string | null;
  invoiceId?: string | null;
  delivery?: Delivery;
  transactionHash?: string | null;
  blockNumber?: number | null;
  contractAddress?: string | null;
  transactionType: 'proof_registration' | 'status_update' | 'verification';
  status: 'pending' | 'confirmed' | 'failed';
  retryCount: number;
  errorMessage?: string | null;
  gasUsed?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProofRecord {
  id: string;
  deliveryId: string;
  algorithm: string;
  payloadHash: string;
  blockchainTransactionId?: string | null;
  blockchainTransaction?: BlockchainTransaction | null;
  verifiedAt?: string | null;
  verificationStatus: VerificationStatus;
  canonicalPayload?: string | null;
  createdAt: string;
}

export interface VerificationResult {
  deliveryId: string;
  deliveryReference: string;
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

export interface DashboardSummary {
  totalDeliveries: number;
  pendingApprovals: number;
  approvedDeliveries: number;
  rejectedDeliveries: number;
  blockchainTransactions: number;
  verificationSuccessRate: number;
}

export interface BlockchainNetworkStatus {
  connected: boolean;
  chainId: number | null;
  blockNumber: number | null;
  nodeUrl: string;
  contractAddress: string | null;
  contractDeployed: boolean;
  mode: 'live' | 'demo';
  peerCount: number | null;
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  actor?: User | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
