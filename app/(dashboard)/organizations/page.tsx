'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Users, Plus } from 'lucide-react';
import { companiesApi, usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Company, User } from '@/models';
import { Column, DataTable } from '@/components/ui';

const TYPE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  sender:   { bg: 'rgba(37,99,235,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
  receiver: { bg: 'rgba(8,145,178,0.12)',  color: '#22d3ee', border: 'rgba(6,182,212,0.3)'   },
  auditor:  { bg: 'rgba(180,83,9,0.12)',   color: '#fbbf24', border: 'rgba(245,158,11,0.3)'  },
};
const ROLE_STYLE: Record<string, { color: string }> = {
  admin:     { color: '#a78bfa' },
  company_a: { color: '#60a5fa' },
  company_b: { color: '#22d3ee' },
  auditor:   { color: '#fbbf24' },
};
const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator', company_a: 'Company A (Sender)', company_b: 'Company B (Receiver)', auditor: 'Auditor',
};

const userColumns: Column<User>[] = [
  {
    header: 'User',
    cell: (u) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {u.name[0]?.toUpperCase()}
        </div>
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{u.name}</span>
      </div>
    ),
  },
  { header: 'Email', cell: (u) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{u.email}</span> },
  {
    header: 'Role',
    cell: (u) => (
      <span style={{ color: (ROLE_STYLE[u.role] ?? { color: '#94a3b8' }).color, fontSize: 12, fontWeight: 600 }}>
        {ROLE_LABEL[u.role] ?? u.role}
      </span>
    ),
  },
  { header: 'Organization', cell: (u) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{u.company?.name ?? '—'}</span> },
  {
    header: 'Status',
    cell: (u) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.isActive ? '#34d399' : '#f87171', display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: u.isActive ? '#34d399' : '#f87171' }}>{u.isActive ? 'Active' : 'Inactive'}</span>
      </div>
    ),
  },
];

export default function OrganizationsPage() {
  const { user: me } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([companiesApi.list(), usersApi.list()])
      .then(([cRes, uRes]) => {
        setCompanies(cRes.data.data ?? []);
        setUsers(uRes.data.data ?? []);
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Organizations & Users</h1>
        </div>
        {me?.role === 'admin' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/users" className="btn btn-secondary">Manage users</Link>
            <Link href="/organizations/create" className="btn btn-primary"><Plus size={15} /> New Organization</Link>
          </div>
        )}
      </div>

      {/* Companies section */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 16px' }}>
          <Building2 size={14} /> Organizations ({companies.length})
        </h2>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {companies.map(c => {
              const ts = TYPE_STYLE[c.organizationType] ?? TYPE_STYLE.sender;
              return (
                <Link key={c.id} href={`/organizations/${c.id}`} style={{ display: 'block', textDecoration: 'none', background: 'rgba(8,15,30,0.85)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 14, padding: '18px 20px' }}>
                  {/* Card top */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: ts.bg, border: `1px solid ${ts.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 800, color: ts.color,
                    }}>
                      {c.name[0]}
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 9999, background: ts.bg, border: `1px solid ${ts.border}`, color: ts.color, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                      {c.organizationType}
                    </span>
                  </div>

                  {/* Name & code */}
                  <p style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: '0 0 2px' }}>{c.name}</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', margin: '0 0 8px' }}>{c.organizationCode}</p>
                  <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 12px', lineHeight: 1.4 }}>{c.description}</p>

                  {/* Active badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.isActive ? '#34d399' : '#f87171', display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: c.isActive ? '#34d399' : '#f87171' }}>{c.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Users table */}
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 16px' }}>
          <Users size={14} /> Users ({users.length})
        </h2>
        <DataTable
          columns={userColumns}
          rows={users}
          loading={loading}
          skeletonRows={4}
          rowKey={(u) => u.id}
        />
      </div>
    </div>
  );
}
