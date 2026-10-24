'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import { Card, Notice, Page, PageHeader } from '@/components/ui';
import { UserForm, userToForm } from '@/components/users/UserForm';

export default function CreateUserPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <Page narrow>
      <PageHeader title="New User" subtitle="Create an account that can sign in immediately" backHref="/users" />
      <Card>
        {user && user.role !== 'admin' && <Notice kind="error">Only administrators can create users.</Notice>}
        {error && <Notice kind="error">{error}</Notice>}
        <UserForm
          isNew
          defaultValues={userToForm()}
          loading={loading}
          submitLabel="Create User"
          onSubmit={async (v) => {
            setLoading(true);
            setError('');
            try {
              await usersApi.create({
                name: v.name.trim(),
                email: v.email.trim(),
                password: v.password,
                role: v.role,
                companyId: v.companyId || undefined,
              });
              router.push('/users');
            } catch (err) {
              setError(apiError(err, 'Could not create user'));
              setLoading(false);
            }
          }}
        />
      </Card>
    </Page>
  );
}
