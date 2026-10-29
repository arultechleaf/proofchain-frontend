'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, KeyRound } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/utils';
import { Button, Card, KeyValue, Notice, Page, PageHeader } from '@/components/ui';
import { UserForm, userToForm } from '@/components/users/UserForm';
import { profilePayload } from '@/components/account/ProfileFields';

interface Created {
  id: string;
  name: string;
  email: string;
  userCode: string;
  temporaryPassword: string;
  passwordExpiryAt: string | null;
}

export default function CreateUserPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the password is visible on screen; copying is a convenience */ }
  };

  // The temporary password exists in plain text only in this response. It is not stored and cannot be shown again.
  if (created) {
    return (
      <Page narrow>
        <PageHeader title="User created" backHref="/users" />
        <Card title="Temporary password" icon={KeyRound}>
          <Notice kind="info">
            Give this password to {created.name} securely. It is shown only once, expires
            {created.passwordExpiryAt ? ` on ${new Date(created.passwordExpiryAt).toLocaleString()}` : ' soon'}, and they must
            choose their own password the first time they sign in.
          </Notice>
          <KeyValue rows={[
            ['User code', created.userCode],
            ['Email', created.email],
            ['Temporary password', <code key="p" style={{ fontSize: 15, letterSpacing: 0.5 }}>{created.temporaryPassword}</code>],
          ]} />
          <div className="form-actions" style={{ marginTop: 16 }}>
            <Button icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy password'}</Button>
            <Link href="/users" className="btn btn-secondary">Back to users</Link>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page narrow>
      <PageHeader title="New User" backHref="/users" />
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
              const res = await usersApi.create({
                ...profilePayload(v),
                email: v.email.trim(),
                password: v.password || undefined,
                role: v.role,
                companyId: v.companyId || undefined,
              });
              setCreated(res.data.data as Created);
            } catch (err) {
              setError(apiError(err, 'Could not create user'));
            } finally {
              setLoading(false);
            }
          }}
        />
      </Card>
    </Page>
  );
}
