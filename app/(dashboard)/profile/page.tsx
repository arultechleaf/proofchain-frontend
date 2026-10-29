'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyRound, UserRound } from 'lucide-react';
import { authApi, session } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { apiError, roleLabel } from '@/lib/utils';
import { Card, Field, KeyValue, Notice, Page, PageHeader, SubmitButton, Form } from '@/components/ui';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirm: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<PasswordForm>();

  if (!user) return null;

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setNameMsg({ kind: 'error', text: 'Name must be at least 2 characters' });
    setSavingName(true);
    setNameMsg(null);
    try {
      const res = await authApi.updateProfile(name.trim());
      // Keep the cached profile (sidebar, top bar) in sync with the server.
      session.saveUser({ ...user, name: res.data.name });
      setNameMsg({ kind: 'success', text: 'Profile updated. Your new name shows everywhere after the next page load.' });
    } catch (err) {
      setNameMsg({ kind: 'error', text: apiError(err, 'Could not update profile') });
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async (v: PasswordForm) => {
    setSavingPw(true);
    setPwMsg(null);
    try {
      await authApi.changePassword(v.currentPassword, v.newPassword);
      reset();
      setPwMsg({ kind: 'success', text: 'Password changed' });
    } catch (err) {
      setPwMsg({ kind: 'error', text: apiError(err, 'Could not change password') });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <Page narrow>
      <PageHeader title="My Profile" subtitle="Your account and password" />

      <Card title="Account" icon={UserRound} style={{ marginBottom: 18 }}>
        {nameMsg && <Notice kind={nameMsg.kind}>{nameMsg.text}</Notice>}
        <KeyValue rows={[
          ['Email', user.email],
          ['Role', roleLabel(user.role)],
          ['Organization', user.company?.name ?? '—'],
        ]} />
        <form onSubmit={saveName} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 16 }}>
          <div style={{ flex: 1 }}>
            <Field label="Display name">
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </Field>
          </div>
          <SubmitButton loading={savingName}>Save</SubmitButton>
        </form>
      </Card>

      <Card title="Change password" icon={KeyRound}>
        {pwMsg && <Notice kind={pwMsg.kind}>{pwMsg.text}</Notice>}
        <Form post onSubmit={handleSubmit(changePassword)} loading={savingPw} submitLabel="Change Password">
          <Field label="Current password" required error={errors.currentPassword?.message}>
            <input type="password" className="form-input" autoComplete="current-password"
              {...register('currentPassword', { required: 'Enter your current password' })} />
          </Field>
          <Field label="New password" required error={errors.newPassword?.message} hint="At least 8 characters">
            <input type="password" className="form-input" autoComplete="new-password"
              {...register('newPassword', { required: 'Enter a new password', minLength: { value: 8, message: 'At least 8 characters' } })} />
          </Field>
          <Field label="Confirm new password" required error={errors.confirm?.message}>
            <input type="password" className="form-input" autoComplete="new-password"
              {...register('confirm', { required: 'Confirm the new password', validate: (v) => v === watch('newPassword') || 'Passwords do not match' })} />
          </Field>
        </Form>
      </Card>
    </Page>
  );
}
