'use client';

import { useAuth } from '@/lib/auth';
import { API_URL, razorpayApi } from '@/lib/api';
import { useAsync } from '@/components/ui';
import { Shield, Server, ExternalLink, Key, CreditCard } from 'lucide-react';

const ROLE_COLOR: Record<string, string> = { admin: '#a78bfa', company_a: '#3ddc84', company_b: '#3ddc84', auditor: '#fbbf24' };
const ROLE_LABEL: Record<string, string> = { admin: 'Administrator', company_a: 'Company A', company_b: 'Company B', auditor: 'Auditor' };

const card: React.CSSProperties = {
  background: 'rgba(11, 15, 13,0.85)', border: '1px solid rgba(34, 197, 94,0.12)',
  borderRadius: 14, padding: '20px 24px', marginBottom: 16,
};

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <Icon size={15} color="#3ddc84" />
      <h2 style={{ fontSize: 14, fontWeight: 700, color: '#c5d1ca', margin: 0 }}>{title}</h2>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid rgba(24, 34, 29,0.7)',
    }}>
      <span style={{ color: '#7b8a82', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ color: '#e8efeb', fontSize: 13 }}>{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const apiUrl = API_URL;
  const razorpay = useAsync<{ enabled: boolean; mode: 'test' | 'live'; webhookConfigured: boolean }>(
    async () => (await razorpayApi.config()).data.data,
    [],
  );

  return (
    <div className="page" style={{ maxWidth: 780 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#eef3f0', margin: 0 }}>Settings</h1>
      </div>

      {/* Profile */}
      {user && (
        <div style={card}>
          <SectionTitle icon={Shield} title="My Profile" />

          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid rgba(24, 34, 29,0.7)' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #16a34a, #166534)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 22, fontWeight: 800,
            }}>
              {user.name[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ color: '#eef3f0', fontSize: 16, fontWeight: 700, margin: '0 0 3px' }}>{user.name}</p>
              <p style={{ color: '#9aa9a1', fontSize: 13, margin: '0 0 4px' }}>{user.email}</p>
              <span style={{ fontSize: 11, fontWeight: 600, color: ROLE_COLOR[user.role] ?? '#9aa9a1' }}>
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
          </div>

          {/* Info rows */}
          <InfoRow label="User ID"  value={<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7b8a82' }}>{user.id}</span>} />
          <InfoRow label="Role"     value={<span style={{ color: ROLE_COLOR[user.role] ?? '#9aa9a1', fontWeight: 600 }}>{ROLE_LABEL[user.role] ?? user.role}</span>} />
          <InfoRow label="Status"   value={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              Active
            </span>
          } />
        </div>
      )}

      {/* Platform config */}
      <div style={card}>
        <SectionTitle icon={Server} title="Platform Configuration" />
        <InfoRow label="API URL"         value={<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#3ddc84' }}>{apiUrl || 'Same origin (/api)'}</span>} />
        <InfoRow label="Environment"     value={<span style={{ color: '#fbbf24', fontWeight: 600 }}>Development</span>} />
        <InfoRow label="Blockchain Mode" value={
          <span style={{ padding: '2px 10px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24', fontSize: 11, fontWeight: 600 }}>
            Demo Mode
          </span>
        } />
        <InfoRow label="Frontend"        value="Next.js 16 (App Router)" />
        <InfoRow label="Backend"         value="NestJS + TypeORM + SQLite" />
        <InfoRow label="Blockchain"      value="Hyperledger Besu (QBFT)" />
        <InfoRow label="Smart Contract"  value="Solidity ^0.8.20" />
      </div>

      {/* Online payments */}
      <div style={card}>
        <SectionTitle icon={CreditCard} title="Online Payments (Razorpay)" />
        <InfoRow label="Status" value={
          razorpay.loading ? 'Checking…'
            : razorpay.data?.enabled
              ? <span style={{ color: '#4ade80' }}>Connected{razorpay.data.mode === 'test' ? ' — test mode' : ' — live'}</span>
              : <span style={{ color: '#fbbf24' }}>Not configured</span>
        } />
        {razorpay.data?.enabled && (
          <InfoRow label="Webhook" value={razorpay.data.webhookConfigured
            ? <span style={{ color: '#4ade80' }}>Secret set</span>
            : <span style={{ color: '#fbbf24' }}>No secret — payments are only recorded when the browser returns</span>} />
        )}
        {!razorpay.loading && !razorpay.data?.enabled && (
          <p style={{ color: '#7b8a82', fontSize: 12, margin: '12px 0 0', lineHeight: 1.6 }}>
            Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env, then restart the backend.
          </p>
        )}
      </div>

      {/* Quick links */}
      <div style={card}>
        <SectionTitle icon={ExternalLink} title="Quick Links" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'My Profile',        url: '/profile',             desc: 'Change your name or password', internal: true },
            { label: 'Roles & Permissions', url: '/roles',             desc: 'What each role can do',        internal: true },
            { label: 'API Documentation', url: `${apiUrl}/api/docs`,   desc: 'Swagger UI — all endpoints' },
            { label: 'Health Check',      url: `${apiUrl}/api/health`, desc: 'System status & uptime'     },
          ].map(link => (
            <a key={link.url} href={link.url} {...(link.internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(17, 24, 21,0.7)', border: '1px solid rgba(40, 56, 48,0.5)',
              textDecoration: 'none', transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(34, 197, 94,0.4)'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(40, 56, 48,0.5)'}
            >
              <ExternalLink size={15} color="#3ddc84" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: '#e8efeb', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{link.label}</p>
                <p style={{ color: '#55655d', fontSize: 11, margin: 0 }}>{link.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Security note */}
      <div style={{ background: 'rgba(22, 163, 74,0.06)', border: '1px solid rgba(34, 197, 94,0.15)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Key size={15} color="#3ddc84" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: '#7b8a82', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            JWT tokens expire after 24 hours. All blockchain transactions are signed with the configured validator wallet.
            In production, rotate API keys and configure HTTPS.
          </p>
        </div>
      </div>
    </div>
  );
}
