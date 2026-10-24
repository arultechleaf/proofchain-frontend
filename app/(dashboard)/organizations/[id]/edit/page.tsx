'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { companiesApi } from '@/lib/api';
import type { Company } from '@/types';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import { Card, Notice, Page, PageHeader, Spinner, useAsync } from '@/components/ui';
import { CompanyForm, companyToForm } from '@/components/organizations/CompanyForm';

export default function EditOrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: company, loading, error: loadError } = useAsync<Company>(async () => (await companiesApi.get(id)).data.data, [id]);

  if (loading && !company) return <Page narrow><Spinner /></Page>;
  if (loadError || !company) return <Page narrow><Notice kind="error">Organization not found.</Notice></Page>;

  return (
    <Page narrow>
      <PageHeader title={`Edit ${company.name}`} backHref={`/organizations/${id}`} />
      <Card>
        {user && user.role !== 'admin' && <Notice kind="error">Only administrators can edit organizations.</Notice>}
        {error && <Notice kind="error">{error}</Notice>}
        <CompanyForm
          showActive
          defaultValues={companyToForm(company)}
          loading={saving}
          submitLabel="Save Changes"
          onSubmit={async (v) => {
            setSaving(true);
            setError('');
            try {
              await companiesApi.update(id, {
                name: v.name.trim(),
                organizationCode: v.organizationCode.trim(),
                organizationType: v.organizationType,
                description: v.description.trim() || undefined,
                isActive: v.isActive,
              });
              router.push(`/organizations/${id}`);
            } catch (err) {
              setError(apiError(err, 'Could not update organization'));
              setSaving(false);
            }
          }}
        />
      </Card>
    </Page>
  );
}
