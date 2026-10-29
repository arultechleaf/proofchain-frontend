'use client';

import { useForm } from 'react-hook-form';
import { CheckField, Field, Grid, Form, useAsync } from '@/components/ui';
import { companiesApi } from '@/lib/api';
import type { Company, User } from '@/models';

export interface UserFormValues {
  name: string;
  email: string;
  role: User['role'];
  companyId: string;
  password: string;
  isActive: boolean;
}

export function userToForm(u?: User): UserFormValues {
  return {
    name: u?.name ?? '',
    email: u?.email ?? '',
    role: u?.role ?? 'company_a',
    companyId: u?.companyId ?? '',
    password: '',
    isActive: u?.isActive ?? true,
  };
}

export const ROLE_OPTIONS: Array<{ value: User['role']; label: string }> = [
  { value: 'admin', label: 'Administrator' },
  { value: 'company_a', label: 'Company A — sender' },
  { value: 'company_b', label: 'Company B — receiver' },
  { value: 'auditor', label: 'Auditor — read only' },
];

export function UserForm({
  defaultValues, onSubmit, loading, submitLabel = 'Save', isNew, isSelf,
}: {
  defaultValues: UserFormValues;
  onSubmit: (v: UserFormValues) => void | Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  isNew?: boolean;
  /** Admins cannot deactivate or change the role of their own account. */
  isSelf?: boolean;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<UserFormValues>({ defaultValues });
  const companies = useAsync<Company[]>(async () => (await companiesApi.list()).data.data, []);
  const role = watch('role');

  return (
    <Form post onSubmit={handleSubmit(onSubmit)} loading={loading} submitLabel={submitLabel}>
      <Grid cols={2}>
        <Field label="Full name" required error={errors.name?.message}>
          <input className="form-input" {...register('name', { required: 'Name is required' })} />
        </Field>
        <Field label="Email" required error={errors.email?.message}>
          <input type="email" className="form-input" disabled={!isNew}
            {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
        </Field>
      </Grid>
      <Grid cols={2}>
        <Field label="Role" hint={isSelf ? 'You cannot change your own role' : undefined}>
          <select className="form-input" disabled={isSelf} {...register('role')}>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Organization" required={role !== 'admin'} error={errors.companyId?.message}>
          <select className="form-input"
            {...register('companyId', { validate: (v) => role === 'admin' || !!v || 'Select an organization' })}>
            <option value="">{role === 'admin' ? 'None' : 'Select...'}</option>
            {(companies.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </Grid>
      <Field label={isNew ? 'Password' : 'New password'} required={isNew} error={errors.password?.message}
        hint={isNew ? 'At least 8 characters' : 'Leave blank to keep the current password'}>
        <input type="password" autoComplete="new-password" className="form-input"
          {...register('password', {
            required: isNew ? 'Password is required' : false,
            minLength: { value: 8, message: 'At least 8 characters' },
            validate: (v) => !v || v.length >= 8 || 'At least 8 characters',
          })} />
      </Field>
      {!isNew && (
        <CheckField label="Account is active (can sign in)" disabled={isSelf} {...register('isActive')} />
      )}
    </Form>
  );
}
