'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { usersApi } from '@/lib/api';
import type { User } from '@/models';
import { useAuth } from '@/lib/auth';
import { apiError, formatDate } from '@/lib/utils';
import { Card, KeyValue, Notice, Page, PageHeader, Spinner, StatusBadge, useAsync } from '@/components/ui';
import { UserForm, userToForm } from '@/components/users/UserForm';

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const { data: user, loading, error, reload } = useAsync<User>(async () => (await usersApi.get(id)).data.data, [id]);

  if (loading && !user) return <Page narrow><Spinner /></Page>;
  if (error || !user) return <Page narrow><Notice kind="error">User not found.</Notice></Page>;

  const isAdmin = me?.role === 'admin';

  return (
    <Page narrow>
      <PageHeader title={user.name} subtitle={user.email} backHref="/users" />
      {message && <Notice kind={message.kind}>{message.text}</Notice>}

      <Card style={{ marginBottom: 18 }}>
        <KeyValue rows={[
          ['Status', <StatusBadge key="s" status={user.isActive ? 'active' : 'inactive'} />],
          ['Member since', formatDate(user.createdAt)],
        ]} />
      </Card>

      <Card title="Edit user">
        {!isAdmin && <Notice kind="error">Only administrators can edit users.</Notice>}
        <UserForm
          defaultValues={userToForm(user)}
          isSelf={me?.id === user.id}
          loading={saving}
          submitLabel="Save Changes"
          onSubmit={async (v) => {
            setSaving(true);
            setMessage(null);
            try {
              await usersApi.update(id, {
                name: v.name.trim(),
                role: v.role,
                companyId: v.companyId || undefined,
                isActive: v.isActive,
                password: v.password || undefined,
              });
              setMessage({ kind: 'success', text: v.password ? 'User updated and password reset' : 'User updated' });
              await reload();
            } catch (err) {
              setMessage({ kind: 'error', text: apiError(err, 'Could not update user') });
            } finally {
              setSaving(false);
            }
          }}
        />
      </Card>
    </Page>
  );
}
