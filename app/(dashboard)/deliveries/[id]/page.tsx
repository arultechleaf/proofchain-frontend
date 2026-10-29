'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, ExternalLink, Shield, Clock, Package, Hash, Blocks } from 'lucide-react';
import { deliveriesApi, approvalsApi, verificationApi } from '@/lib/api';
import type { Delivery, Approval, ProofRecord, VerificationResult } from '@/models';
import { formatDate, formatRelative, statusColor, statusLabel, truncateHash, copyToClipboard } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { canUse } from '@/lib/roles';
import { Tabs } from '@/components/ui';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 text-slate-600 hover:text-slate-300 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function InfoRow({ label, value, mono, hash }: { label: string; value: React.ReactNode; mono?: boolean; hash?: boolean }) {
  const valStr = typeof value === 'string' ? value : '';
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider flex-shrink-0 w-36">{label}</span>
      <div className={`flex-1 flex items-center justify-end gap-1 text-right ${hash ? 'hash-display text-blue-400 break-all' : mono ? 'font-mono text-xs text-slate-300' : 'text-sm text-slate-200'}`}>
        {value}
        {hash && valStr && <CopyButton text={valStr} />}
      </div>
    </div>
  );
}

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [proof, setProof] = useState<ProofRecord | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verResult, setVerResult] = useState<VerificationResult | null>(null);
  const [approving, setApproving] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'proof' | 'approvals'>('details');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      deliveriesApi.get(id),
      deliveriesApi.getProof(id),
      approvalsApi.list(id),
    ]).then(([dRes, pRes, aRes]) => {
      setDelivery(dRes.data.data);
      setProof(pRes.data.data);
      setApprovals(aRes.data.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await verificationApi.verify(id);
      setVerResult(res.data.data);
    } catch { } finally { setVerifying(false); }
  };

  const handleApprove = async (decision: 'approved' | 'rejected') => {
    setApproving(true);
    try {
      await approvalsApi.create(id, { decision, comment: approvalComment });
      const [dRes, aRes] = await Promise.all([deliveriesApi.get(id), approvalsApi.list(id)]);
      setDelivery(dRes.data.data);
      setApprovals(aRes.data.data ?? []);
      setApprovalComment('');
    } catch { } finally { setApproving(false); }
  };

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );

  if (!delivery) return (
    <div className="p-6 text-center text-slate-500">
      <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>Delivery not found</p>
      <Link href="/deliveries" className="btn btn-secondary mt-4 text-xs">Back to list</Link>
    </div>
  );

  const canApprove = canUse('approvals', user?.role);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/deliveries" className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 font-mono">{delivery.deliveryReference}</h1>
            <p className="text-slate-500 text-xs">Created {formatRelative(delivery.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${statusColor(delivery.status)}`}>{statusLabel(delivery.status)}</span>
          <span className={`badge ${statusColor(delivery.blockchainStatus)}`}>{statusLabel(delivery.blockchainStatus)}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}
        options={(['details', 'proof', 'approvals'] as const).map((t) => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />

      {activeTab === 'details' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-card rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-blue-400" /> Delivery Details</h2>
            <InfoRow label="Description" value={delivery.description} />
            <InfoRow label="Quantity" value={<span className="font-mono">{delivery.quantity.toLocaleString()}</span>} />
            <InfoRow label="Sender" value={delivery.senderCompany?.name ?? delivery.senderCompanyId} />
            <InfoRow label="Receiver" value={delivery.receiverCompany?.name ?? delivery.receiverCompanyId} />
            <InfoRow label="Created" value={formatDate(delivery.createdAt)} />
            <InfoRow label="Updated" value={formatDate(delivery.updatedAt)} />
            {delivery.metadata && (
              <div className="pt-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Metadata</p>
                <pre className="bg-slate-900/60 rounded-lg p-3 text-xs font-mono text-slate-400 overflow-x-auto">
                  {JSON.stringify(delivery.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Verify button */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-cyan-400" /> Verification</h3>
              <button onClick={handleVerify} disabled={verifying} className="btn btn-secondary w-full justify-center text-sm">
                {verifying ? <><span className="animate-spin w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full" /></> : 'Verify Proof'}
              </button>
              <Link href={`/deliveries/${id}/proof`} className="btn btn-secondary w-full justify-center text-sm mt-2">Proof certificate</Link>
              {verResult && (
                <div className={`mt-3 p-3 rounded-lg border text-xs ${verResult.status === 'verified' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                  <p className="font-bold uppercase">{verResult.status}</p>
                  <p className="mt-1 text-slate-500">Hash match: {verResult.hashMatch ? 'Yes' : 'No'}</p>
                  {verResult.blockchainMode === 'demo' && <p className="text-amber-400 mt-1">⚠ Demo mode</p>}
                </div>
              )}
            </div>

            {/* Approve/Reject for Company B */}
            {canApprove && delivery.status === 'pending' && (
              <div className="glass-card rounded-xl p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Approval</h3>
                <textarea className="form-input resize-none h-16 text-xs mb-3" placeholder="Optional comment..."
                  value={approvalComment} onChange={e => setApprovalComment(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => handleApprove('approved')} disabled={approving} className="btn btn-primary flex-1 text-xs py-1.5">Approve</button>
                  <button onClick={() => handleApprove('rejected')} disabled={approving} className="btn btn-danger flex-1 text-xs py-1.5">Reject</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'proof' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Hash className="w-4 h-4 text-blue-400" /> Cryptographic Proof</h2>
          {proof ? (
            <>
              <InfoRow label="Algorithm" value={proof.algorithm} />
              <InfoRow label="Payload Hash" value={delivery.payloadHash ?? '—'} hash />
              {proof.blockchainTransaction && (
                <>
                  <InfoRow label="TX Hash" value={proof.blockchainTransaction.transactionHash ?? 'Pending'} hash />
                  <InfoRow label="Block Number" value={proof.blockchainTransaction.blockNumber ? `#${proof.blockchainTransaction.blockNumber}` : '—'} mono />
                  <InfoRow label="Contract" value={proof.blockchainTransaction.contractAddress ?? '—'} hash />
                  <InfoRow label="Status" value={<span className={`badge ${statusColor(proof.blockchainTransaction.status)}`}>{statusLabel(proof.blockchainTransaction.status)}</span>} />
                </>
              )}
              {proof.verifiedAt && <InfoRow label="Last Verified" value={formatDate(proof.verifiedAt)} />}
              {proof.canonicalPayload && (
                <div className="pt-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Canonical Payload (hashed)</p>
                  <pre className="bg-slate-900/60 rounded-lg p-3 text-xs font-mono text-slate-500 overflow-x-auto max-h-32">
                    {proof.canonicalPayload}
                  </pre>
                </div>
              )}
            </>
          ) : <p className="text-slate-500 text-sm">No proof record found for this delivery.</p>}
        </motion.div>
      )}

      {activeTab === 'approvals' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Approval History</h2>
          {approvals.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No approval actions yet</p>
          ) : approvals.map((a, i) => (
            <div key={a.id} className="flex gap-4 pb-4 mb-4 border-b border-slate-800/60 last:border-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${a.decision === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                <Check className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-slate-200">{a.reviewer?.name ?? 'Unknown'}</span>
                  <span className={`badge ${statusColor(a.decision)}`}>{a.decision}</span>
                </div>
                {a.comment && <p className="text-xs text-slate-500 italic">"{a.comment}"</p>}
                <p className="text-xs text-slate-600 mt-1">{formatDate(a.createdAt)}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
