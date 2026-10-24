'use client';

import { Check, Minus, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/utils';
import { Card, Notice, Page, PageHeader } from '@/components/ui';

type Level = 'full' | 'read' | 'own' | 'none';
const ROLES = ['admin', 'company_a', 'company_b', 'auditor'] as const;

// Mirrors what the API enforces; see the guards and tenant helpers in the backend.
const PERMISSIONS: Array<{ area: string; levels: Record<(typeof ROLES)[number], Level> }> = [
  { area: 'Customers, suppliers & items', levels: { admin: 'full', company_a: 'own', company_b: 'own', auditor: 'read' } },
  { area: 'Sales & purchase documents', levels: { admin: 'full', company_a: 'own', company_b: 'own', auditor: 'read' } },
  { area: 'Payments & accounts', levels: { admin: 'full', company_a: 'own', company_b: 'own', auditor: 'read' } },
  { area: 'Reports', levels: { admin: 'full', company_a: 'own', company_b: 'own', auditor: 'read' } },
  { area: 'Create deliveries', levels: { admin: 'full', company_a: 'full', company_b: 'none', auditor: 'none' } },
  { area: 'Approve / reject deliveries', levels: { admin: 'full', company_a: 'none', company_b: 'full', auditor: 'none' } },
  { area: 'Verify proofs & blockchain explorer', levels: { admin: 'full', company_a: 'full', company_b: 'full', auditor: 'full' } },
  { area: 'Audit logs', levels: { admin: 'full', company_a: 'none', company_b: 'none', auditor: 'read' } },
  { area: 'Organizations', levels: { admin: 'full', company_a: 'none', company_b: 'none', auditor: 'read' } },
  { area: 'Users & roles', levels: { admin: 'full', company_a: 'none', company_b: 'none', auditor: 'read' } },
];

const LEVEL: Record<Level, { label: string; color: string; icon: React.ElementType }> = {
  full: { label: 'Full access', color: '#34d399', icon: Check },
  own: { label: 'Own organization', color: '#60a5fa', icon: Check },
  read: { label: 'Read only', color: '#fbbf24', icon: Check },
  none: { label: 'No access', color: '#475569', icon: Minus },
};

export default function RolesPage() {
  const { user } = useAuth();

  return (
    <Page>
      <PageHeader title="Roles & Permissions" subtitle="What each role can do in ProofChain" />
      {user && <Notice kind="info">You are signed in as <strong>{roleLabel(user.role)}</strong>.</Notice>}

      <Card title="Permission matrix" icon={ShieldCheck}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Area</th>
                {ROLES.map((r) => (
                  <th key={r} style={{
                    padding: '10px 12px', fontSize: 12, textAlign: 'center',
                    color: r === user?.role ? '#60a5fa' : '#94a3b8',
                  }}>{roleLabel(r)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.area} style={{ borderTop: '1px solid rgba(30,41,59,0.6)' }}>
                  <td style={{ padding: '11px 12px', color: '#cbd5e1' }}>{p.area}</td>
                  {ROLES.map((r) => {
                    const l = LEVEL[p.levels[r]];
                    const Icon = l.icon;
                    return (
                      <td key={r} style={{ padding: '11px 12px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: l.color, fontSize: 12 }}>
                          <Icon size={13} /> {l.label}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 14, lineHeight: 1.6 }}>
          &quot;Own organization&quot; means records are limited to the user&apos;s own company — a user from one company
          can never see another company&apos;s customers, items, invoices or payments. Auditors can read across companies but cannot change anything.
        </p>
      </Card>
    </Page>
  );
}
