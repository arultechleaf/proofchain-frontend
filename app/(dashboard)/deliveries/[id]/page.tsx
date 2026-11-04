'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Award, Check, CheckCircle2, Copy, Hash, Loader2, Package, ShieldCheck, X, XCircle } from 'lucide-react';
import { deliveriesApi, approvalsApi, verificationApi } from '@/lib/api';
import type { Delivery, Approval, ProofRecord, VerificationResult } from '@/models';
import { formatDate, formatRelative, statusColor, statusLabel, copyToClipboard } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { canUse } from '@/lib/roles';
import { Button, Card, EmptyState, KeyValue, Page, PageHeader, Spinner, StatusBadge, Tabs } from '@/components/ui';

/** A long hash or address: monospace, wraps instead of overflowing, with a copy button. */
function HashValue({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6, justifyContent: 'flex-end' }}>
      <span className="link-mono" style={{ wordBreak: 'break-all', fontWeight: 500 }}>{text}</span>
      <button type="button" onClick={copy} className="icon-btn" aria-label="Copy" title={copied ? 'Copied' : 'Copy'} style={{ flexShrink: 0 }}>
        {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
      </button>
    </span>
  );
}

/** "pallets" -> "Pallets", "deliveryDate" -> "Delivery date" */
const humanize = (key: string) => {
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
/** "600kg" -> "600 kg"; objects are shown as JSON. */
const showValue = (v: unknown): string => {
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  const s = String(v ?? '—');
  return /^\d+(\.\d+)?[a-zA-Z]+$/.test(s) ? s.replace(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/, '$1 $2') : s;
};
/** "Company A — Shipper" -> its name and its role label. */
const splitCompany = (name: string): { title: string; role: string | null } => {
  const parts = name.split(/\s+[—–-]\s+/);
  return { title: parts[0], role: parts.length > 1 ? parts.slice(1).join(' — ') : null };
};

type Tab = 'details' | 'proof' | 'approvals';

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
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [hashCopied, setHashCopied] = useState(false);

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

  if (loading) return <Page><Spinner /></Page>;

  if (!delivery) return (
    <Page>
      <EmptyState icon={Package} title="Delivery not found" action={<Link href="/deliveries" className="btn btn-secondary">Back to deliveries</Link>} />
    </Page>
  );

  const canApprove = canUse('approvals', user?.role);
  const metadata = delivery.metadata ? Object.entries(delivery.metadata as Record<string, unknown>) : [];
  const sender = splitCompany(delivery.senderCompany?.name ?? String(delivery.senderCompanyId));
  const receiver = splitCompany(delivery.receiverCompany?.name ?? String(delivery.receiverCompanyId));
  const txHash = proof?.blockchainTransaction?.transactionHash ?? null;

  const copyHash = async () => {
    if (!txHash) return;
    await copyToClipboard(txHash);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  return (
    <Page>
      <PageHeader
        title={delivery.deliveryReference}
        backHref="/deliveries"
        actions={
          <>
            <span className={`badge ${statusColor(delivery.status)}`} title="Delivery status">{statusLabel(delivery.status)}</span>
            <span className={`badge ${statusColor(delivery.blockchainStatus)}`} title="Blockchain status">Chain: {statusLabel(delivery.blockchainStatus)}</span>
          </>
        }
      />
      <p className="text-muted" style={{ margin: '-14px 0 18px 44px', fontSize: 13 }}>Created {formatRelative(delivery.createdAt)}</p>

      <div style={{ marginBottom: 18 }}>
        <Tabs value={activeTab} onChange={setActiveTab}
          options={(['details', 'proof', 'approvals'] as const).map((t) => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
      </div>

      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.9fr) minmax(280px, 1fr)', gap: 18, alignItems: 'start' }} className="dd-layout">
          <Card title="Delivery details" icon={Package}>
            <div className="dd-tiles">
              <div className="dd-tile">
                <span className="dd-label">Quantity</span>
                <span className="dd-qty">{delivery.quantity.toLocaleString()}</span>
              </div>
              <div className="dd-tile">
                <span className="dd-label">Description</span>
                <strong>{delivery.description}</strong>
              </div>
            </div>

            <div className="dd-parties">
              <div className="dd-party">
                <span className="dd-label">Sender</span>
                <strong>{sender.title}</strong>
                {sender.role && <span className="dd-role sender">{sender.role}</span>}
              </div>
              <span className="dd-arrow"><ArrowRight size={20} /></span>
              <div className="dd-party">
                <span className="dd-label">Receiver</span>
                <strong>{receiver.title}</strong>
                {receiver.role && <span className="dd-role receiver">{receiver.role}</span>}
              </div>
            </div>

            {metadata.length > 0 && (
              <>
                <p className="dd-section-label">Metadata</p>
                <div className="dd-chips">
                  {metadata.map(([k, v]) => (
                    <span key={k} className="dd-chip">{humanize(k)} <b>{showValue(v)}</b></span>
                  ))}
                </div>
              </>
            )}

            <div className="dd-timeline">
              <p className="dd-section-label">Timeline</p>
              <div className="dd-timeline-row">
                <div className="dd-time">
                  <span className="dd-time-title"><span className="dd-dot" /> Created</span>
                  <span className="dd-when">{formatDate(delivery.createdAt)}</span>
                </div>
                <div className="dd-time">
                  <span className="dd-time-title"><span className="dd-dot on" /> Last updated</span>
                  <span className="dd-when">{formatDate(delivery.updatedAt)}</span>
                </div>
              </div>
            </div>
          </Card>

          <div style={{ display: 'grid', gap: 18 }}>
            <div className="dd-verify">
              <h3 className="dd-verify-title"><ShieldCheck size={17} color="#34d399" /> Verification</h3>
              <p className="dd-verify-text">
                Check this delivery against the proof recorded on the blockchain. Any change to the details above will fail verification.
              </p>
              <p className="dd-verify-label">Transaction hash</p>
              <div className="dd-hash">
                <span>{txHash ?? '[0x… transaction hash]'}</span>
                {txHash && (
                  <button type="button" onClick={copyHash} aria-label="Copy transaction hash" title={hashCopied ? 'Copied' : 'Copy'}>
                    {hashCopied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
              <button type="button" className="dd-btn dd-btn-primary" onClick={handleVerify} disabled={verifying}>
                {verifying ? <><Loader2 size={15} className="spin" /> Verifying…</> : 'Verify proof'}
              </button>
              <Link href={`/deliveries/${id}/proof`} className="dd-btn dd-btn-outline"><Award size={15} /> Proof certificate</Link>
              {verResult && (
                <div className={`dd-result ${verResult.status === 'verified' ? 'ok' : 'bad'}`} role="status">
                  <strong style={{ textTransform: 'capitalize' }}>{verResult.status}</strong>
                  <div>Hash match: {verResult.hashMatch ? 'Yes' : 'No'}</div>
                  {verResult.blockchainMode === 'demo' && <div>Demo mode: not checked against the live chain</div>}
                </div>
              )}
            </div>

            {canApprove && delivery.status === 'pending' && (
              <Card title="Approval" icon={CheckCircle2}>
                <textarea className="form-input" rows={3} style={{ resize: 'none', marginBottom: 12 }} placeholder="Optional comment..."
                  value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="success" icon={Check} fullWidth disabled={approving} onClick={() => handleApprove('approved')}>Approve</Button>
                  <Button variant="danger" icon={X} fullWidth disabled={approving} onClick={() => handleApprove('rejected')}>Reject</Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === 'proof' && (
        <Card title="Cryptographic proof" icon={Hash}>
          {proof ? (
            <>
              <KeyValue rows={[
                ['Algorithm', proof.algorithm],
                ['Payload hash', delivery.payloadHash ? <HashValue key="ph" text={delivery.payloadHash} /> : '—'],
                ...(proof.blockchainTransaction ? ([
                  ['Transaction hash', proof.blockchainTransaction.transactionHash ? <HashValue key="th" text={proof.blockchainTransaction.transactionHash} /> : 'Pending'],
                  ['Block number', proof.blockchainTransaction.blockNumber ? `#${proof.blockchainTransaction.blockNumber}` : '—'],
                  ['Contract', proof.blockchainTransaction.contractAddress ? <HashValue key="ca" text={proof.blockchainTransaction.contractAddress} /> : '—'],
                  ['Status', <StatusBadge key="st" status={proof.blockchainTransaction.status} />],
                ] as Array<[string, React.ReactNode]>) : []),
                ...(proof.verifiedAt ? ([['Last verified', formatDate(proof.verifiedAt)]] as Array<[string, React.ReactNode]>) : []),
              ]} />
              {proof.canonicalPayload && (
                <div style={{ marginTop: 18 }}>
                  <p className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Canonical payload (hashed)</p>
                  <pre style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: 12, fontSize: 12, overflow: 'auto', maxHeight: 160, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {proof.canonicalPayload}
                  </pre>
                </div>
              )}
            </>
          ) : <p className="text-muted">No proof record found for this delivery.</p>}
        </Card>
      )}

      {activeTab === 'approvals' && (
        <Card title="Approval history" icon={CheckCircle2}>
          {approvals.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No approval actions yet" />
          ) : approvals.map((a) => {
            const approved = a.decision === 'approved';
            const Icon = approved ? CheckCircle2 : XCircle;
            return (
              <div key={a.id} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(30,41,59,0.6)' }}>
                <Icon size={22} color={approved ? '#34d399' : '#f87171'} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{a.reviewer?.name ?? 'Unknown'}</strong>
                    <StatusBadge status={a.decision} />
                    <span className="text-muted" style={{ fontSize: 12, marginLeft: 'auto' }}>{formatDate(a.createdAt)}</span>
                  </div>
                  {a.comment && <p className="text-muted" style={{ fontSize: 13, margin: '6px 0 0', fontStyle: 'italic' }}>“{a.comment}”</p>}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </Page>
  );
}
