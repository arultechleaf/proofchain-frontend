export interface User {
  id: number;
  name: string;
  email: string;
  /** Key of a role from the roles table (admin, manager, auditor, user, company_a, company_b, or a custom role). */
  role: string;
  /** The number stored for the role (roles.id). */
  roleId?: number;
  companyId: number | null;
  company?: Company;
  isActive: boolean;
  userCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  mobile?: string | null;
  alternateMobile?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  designation?: string | null;
  pincode?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  landmark?: string | null;
  address?: string | null;
  /** True while the account still has an admin-issued temporary password. */
  mustChangePassword?: boolean;
  passwordExpiryAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: number;
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
  id: number;
  deliveryReference: string;
  senderCompanyId: number;
  senderCompany?: Company;
  receiverCompanyId: number;
  receiverCompany?: Company;
  description: string;
  quantity: number;
  metadata?: Record<string, unknown> | null;
  payloadHash?: string | null;
  status: DeliveryStatus;
  blockchainStatus: BlockchainStatus;
  createdBy: number;
  creator?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: number;
  deliveryId: number;
  reviewerId: number;
  reviewer?: User;
  decision: 'approved' | 'rejected';
  comment?: string | null;
  createdAt: string;
}

export * from './billing';
export * from './notifications';

export interface BlockchainTransaction {
  id: number;
  deliveryId: number | null;
  invoiceId?: number | null;
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
  id: number;
  deliveryId: number;
  algorithm: string;
  payloadHash: string;
  blockchainTransactionId?: number | null;
  blockchainTransaction?: BlockchainTransaction | null;
  verifiedAt?: string | null;
  verificationStatus: VerificationStatus;
  canonicalPayload?: string | null;
  createdAt: string;
}

export interface VerificationResult {
  deliveryId: number;
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
  id: number;
  actorId?: number | null;
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
