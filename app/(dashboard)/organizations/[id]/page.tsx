'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Building2, Pencil, Users } from 'lucide-react';
import { companiesApi } from '@/lib/api';
import type { Company, User } from '@/models';
import { useAuth } from '@/lib/auth';
import { formatDate, roleLabel } from '@/lib/utils';
import {
  Card, Column, DataTable, EmptyState, Grid, KeyValue, Notice, Page, PageHeader, Spinner, StatusBadge, useAsync,
} from '@/components/ui';

type CompanyDetail = Company & { users: User[] };

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: company, loading, error } = useAsync<CompanyDetail>(async () => (await companiesApi.get(id)).data.data, [id]);

  if (loading && !company) return <Page><Spinner /></Page>;
  if (error || !company) return <Page><Notice kind="error">Organization not found, or you do not have access to it.</Notice></Page>;

  const columns: Column<User>[] = [
    {
      header: 'Name',
      cell: (u) => user?.role === 'admin'
        ? <Link href={`/users/${u.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>{u.name}</Link>
        : u.name,
    },
    { header: 'Email', cell: (u) => u.email },
    { header: 'Role', cell: (u) => roleLabel(u.role) },
    { header: 'Status', cell: (u) => <StatusBadge status={u.isActive ? 'active' : 'inactive'} /> },
  ];

  return (
    <Page>
      <PageHeader
        title={company.name}
        subtitle={<span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{company.organizationCode}</span>}
        backHref="/organizations"
        actions={user?.role === 'admin' && (
          <Link href={`/organizations/${company.id}/edit`} className="btn btn-primary"><Pencil size={15} /> Edit</Link>
        )}
      />

      <Grid cols="1fr 2fr" gap={18}>
        <Card title="Details" icon={Building2}>
          <KeyValue rows={[
            ['Type', <span key="t" style={{ textTransform: 'capitalize' }}>{company.organizationType}</span>],
            ['Status', <StatusBadge key="s" status={company.isActive ? 'active' : 'inactive'} />],
            ['Created', formatDate(company.createdAt)],
            ['Members', company.users.length],
          ]} />
          {company.description && <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 14, lineHeight: 1.5 }}>{company.description}</p>}
        </Card>

        <Card title="Members" icon={Users}>
          <DataTable columns={columns} rows={company.users} rowKey={(u) => u.id}
            empty={<EmptyState icon={Users} title="No users in this organization yet" />} />
        </Card>
      </Grid>
    </Page>
  );
}
