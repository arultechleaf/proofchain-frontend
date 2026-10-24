'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Blocks, Wifi, WifiOff, RefreshCw, Activity,
  Hash, Clock, Network,
} from 'lucide-react';
import { blockchainApi } from '@/lib/api';
import type { BlockchainTransaction, BlockchainNetworkStatus } from '@/types';
import { formatRelative, truncateHash, statusColor, statusLabel } from '@/lib/utils';

/* --- Network Topology SVG ------------------------------------------------- */
function NetworkTopology({ connected }: { connected: boolean }) {
  const nodes = [
    { id: 'company-a', label: 'Company A', x: 200, y: 80,  r: 36, color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },
    { id: 'company-b', label: 'Company B', x: 370, y: 200, r: 36, color: '#06b6d4', glow: 'rgba(6,182,212,0.5)' },
    { id: 'auditor',   label: 'Auditor',   x: 30,  y: 200, r: 36, color: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  ];
  const edges = [
    ['company-a', 'company-b'],
    ['company-b', 'auditor'],
    ['auditor',   'company-a'],
  ];
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div style={{ position: 'relative', width: '100%', height: 280 }}>
      <svg width="100%" height="100%" viewBox="-30 30 460 230" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        <defs>
          {nodes.map((n) => (
            <radialGradient key={n.id} id={`rg-${n.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={n.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={n.color} stopOpacity="0.03" />
            </radialGradient>
          ))}
        </defs>

        {/* Edges */}
        {edges.map(([a, b], i) => {
          const na = nodeMap[a], nb = nodeMap[b];
          return (
            <g key={i}>
              <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke="rgba(59,130,246,0.18)" strokeWidth="1.5" strokeDasharray="6 5" />
              {connected && (
                <motion.circle r="3.5" fill={na.color}
                  style={{ filter: `drop-shadow(0 0 5px ${na.color})` }}
                  initial={{ cx: na.x, cy: na.y, opacity: 0.9 }}
                  animate={{ cx: [na.x, nb.x], cy: [na.y, nb.y], opacity: [0.9, 0] }}
                  transition={{ duration: 2 + i * 0.8, repeat: Infinity, delay: i * 1.0, ease: 'linear' }}
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n, idx) => (
          <g key={n.id}>
            <motion.circle cx={n.x} cy={n.y} r={n.r + 14}
              fill="none" stroke={n.color} strokeWidth="1" strokeOpacity="0.2"
              animate={{ r: [n.r + 10, n.r + 20], opacity: [0.5, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: idx * 0.7 }}
            />
            <circle cx={n.x} cy={n.y} r={n.r + 4} fill={`url(#rg-${n.id})`} />
            <circle cx={n.x} cy={n.y} r={n.r}
              fill="rgba(5,13,26,0.88)" stroke={n.color} strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 12px ${n.glow})` }}
            />
            <motion.circle cx={n.x} cy={n.y} r="9" fill={n.color}
              animate={{ r: [8, 11, 8] }}
              transition={{ duration: 2, repeat: Infinity, delay: idx * 0.4 }}
              opacity={connected ? 1 : 0.3}
              style={{ filter: `drop-shadow(0 0 8px ${n.color})` }}
            />
            <circle cx={n.x + n.r - 7} cy={n.y - n.r + 7} r="5"
              fill={connected ? '#10b981' : '#4b5563'} stroke="rgba(5,13,26,0.9)" strokeWidth="2" />
            <text x={n.x} y={n.y + n.r + 20}
              textAnchor="middle" fill="#94a3b8" fontSize="11"
              fontFamily="Inter, sans-serif" fontWeight="600">
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      {!connected && (
        <div style={{
          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 8, padding: '4px 14px', fontSize: 11, color: '#fbbf24', whiteSpace: 'nowrap',
        }}>
          ⚠ Demo Mode — Besu not connected
        </div>
      )}
    </div>
  );
}

/* --- Stat Card ------------------------------------------------------------ */
function StatCard({ label, value, color, icon: Icon, loading }: {
  label: string; value: string | number; color: string;
  icon: React.ElementType; loading: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ borderRadius: 18, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${color}15`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <div>
        {loading
          ? <div className="skeleton" style={{ height: 28, width: 80, borderRadius: 8, marginBottom: 4 }} />
          : <p style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
        }
        <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{label}</p>
      </div>
    </motion.div>
  );
}

/* --- Tx Row --------------------------------------------------------------- */
function TxRow({ tx, i }: { tx: BlockchainTransaction; i: number }) {
  const dot = tx.status === 'confirmed' ? '#10b981' : tx.status === 'failed' ? '#ef4444' : '#f59e0b';
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04, duration: 0.22 }}
      style={{
        background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.45)',
        borderRadius: 12, padding: '10px 14px', cursor: 'default',
        transition: 'border-color 0.2s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block', boxShadow: `0 0 6px ${dot}` }} />
          <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#93c5fd' }}>
            {tx.transactionHash
              ? <Link href={`/explorer/${tx.transactionHash}`} style={{ color: 'inherit', textDecoration: 'none' }}>{truncateHash(tx.transactionHash, 10, 8)}</Link>
              : 'Pending…'}
          </span>
        </div>
        <span className={`badge text-xs ${statusColor(tx.status)}`}>{statusLabel(tx.status)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
        <span>{tx.transactionType?.replace(/_/g, ' ') ?? '—'}</span>
        <span>{tx.blockNumber && `Block #${tx.blockNumber}  `}{formatRelative(tx.createdAt)}</span>
      </div>
      {tx.errorMessage && tx.status !== 'confirmed' && (
        <p style={{ fontSize: 11, color: '#f87171', marginTop: 4, fontStyle: 'italic' }}>{tx.errorMessage}</p>
      )}
    </motion.div>
  );
}

/* --- Page ----------------------------------------------------------------- */
export default function ExplorerPage() {
  const [status, setStatus]       = useState<BlockchainNetworkStatus | null>(null);
  const [transactions, setTxs]    = useState<BlockchainTransaction[]>([]);
  const [nodes, setNodes]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [sRes, tRes, nRes] = await Promise.all([
        blockchainApi.status(), blockchainApi.transactions(), blockchainApi.network(),
      ]);
      setStatus(sRes.data.data);
      setTxs(tRes.data.data ?? []);
      setNodes(nRes.data.data?.nodes ?? []);
    } catch { /* silent */ } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const connected = !!status?.connected;

  const stats = [
    { label: 'Connection',   value: connected ? 'Live' : 'Demo',                          color: connected ? '#10b981' : '#f59e0b', icon: connected ? Wifi : WifiOff },
    { label: 'Chain ID',     value: status?.chainId ? `#${status.chainId}` : '—',         color: '#3b82f6', icon: Hash },
    { label: 'Block Height', value: status?.blockNumber?.toLocaleString() ?? '—',          color: '#06b6d4', icon: Blocks },
    { label: 'Peer Count',   value: status?.peerCount ?? '—',                              color: '#8b5cf6', icon: Network },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(37,99,235,0.4)',
            flexShrink: 0,
          }}>
            <Activity style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>Blockchain Explorer</h1>
            <p style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>Hyperledger Besu network status &amp; transactions</p>
          </div>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} className="btn btn-secondary"
          style={{ fontSize: 13, padding: '8px 16px', gap: 6 }}>
          <RefreshCw style={{ width: 14, height: 14 }} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} loading={loading} />)}
      </div>

      {/* Main 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>

        {/* Network Topology */}
        <div className="glass-card" style={{ borderRadius: 20, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Network style={{ width: 15, height: 15, color: '#3b82f6' }} />
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Network Topology</h2>
            <span style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: connected ? '#10b981' : '#f59e0b',
              background: connected ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
              borderRadius: 20, padding: '3px 10px',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
                background: connected ? '#10b981' : '#f59e0b',
                boxShadow: `0 0 5px ${connected ? '#10b981' : '#f59e0b'}`,
              }} />
              {connected ? 'Live' : 'Demo'}
            </span>
          </div>

          <NetworkTopology connected={connected} />

          {nodes.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nodes.map((n) => (
                <div key={n.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.4)',
                  borderRadius: 10, padding: '8px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: n.status === 'online' ? '#10b981' : '#475569',
                      boxShadow: n.status === 'online' ? '0 0 6px #10b981' : 'none',
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1' }}>{n.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#475569' }}>
                    <span>RPC :{n.rpcPort}</span><span>P2P :{n.p2pPort}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {status?.contractAddress && (
            <div style={{
              marginTop: 12, background: 'rgba(15,23,42,0.5)',
              border: '1px solid rgba(51,65,85,0.4)', borderRadius: 10, padding: '10px 12px',
            }}>
              <p style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Contract Address</p>
              <p className="hash-display" style={{ fontSize: 11, wordBreak: 'break-all' }}>{status.contractAddress}</p>
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="glass-card" style={{ borderRadius: 20, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock style={{ width: 15, height: 15, color: '#06b6d4' }} />
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Recent Transactions</h2>
            {!loading && (
              <span style={{
                marginLeft: 'auto', fontSize: 11, color: '#475569',
                background: 'rgba(51,65,85,0.4)', borderRadius: 20, padding: '2px 10px',
              }}>{transactions.length} tx</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />
                ))
              : transactions.length === 0
              ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: 10 }}>
                  <Blocks style={{ width: 30, height: 30, color: '#334155' }} />
                  <p style={{ fontSize: 13, color: '#334155' }}>No transactions yet</p>
                </div>
              )
              : transactions.map((tx, i) => <TxRow key={tx.id} tx={tx} i={i} />)
            }
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="glass-card" style={{
        borderRadius: 14, padding: '12px 18px',
        borderColor: 'rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.03)',
      }}>
        <p style={{ fontSize: 12, color: 'rgba(251,191,36,0.75)', lineHeight: 1.65 }}>
          <strong>Important:</strong> In demo mode, transaction hashes are simulated and not registered on a real blockchain.
          To activate live mode: deploy the smart contract, set{' '}
          <code style={{ background: 'rgba(51,65,85,0.6)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>CONTRACT_ADDRESS</code>
          {' '}and{' '}
          <code style={{ background: 'rgba(51,65,85,0.6)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>BLOCKCHAIN_MODE=live</code>
          {' '}in the backend environment, then restart the server.
        </p>
      </div>
    </div>
  );
}
