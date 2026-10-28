'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { companiesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import { Card, Notice, Page, PageHeader } from '@/components/ui';
import { CompanyForm, companyToForm } from '@/components/organizations/CompanyForm';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <Page narrow>
      <PageHeader title="New Organization" subtitle="Add a participant to the network" backHref="/organizations" />
      <Card>
        {user && user.role !== 'admin' && <Notice kind="error">Only administrators can create organizations.</Notice>}
        {error && <Notice kind="error">{error}</Notice>}
        <CompanyForm
          defaultValues={companyToForm()}
          loading={loading}
          submitLabel="Create Organization"
          onSubmit={async (v) => {
            setLoading(true);
            setError('');
            try {
              const res = await companiesApi.create({
                name: v.name.trim(),
                organizationCode: v.organizationCode.trim(),
                organizationType: v.organizationType,
                description: v.description.trim() || undefined,
                gstin: v.gstin.trim().toUpperCase() || undefined,
              });
              router.push(`/organizations/${res.data.data.id}`);
            } catch (err) {
              setError(apiError(err, 'Could not create organization'));
              setLoading(false);
            }
          }}
        />
      </Card>
    </Page>
  );
}
