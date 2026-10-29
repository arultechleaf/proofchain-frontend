'use client';

import { useForm } from 'react-hook-form';
import { CheckField, Field, Grid, Form, useAsync } from '@/components/ui';
import { companiesApi } from '@/lib/api';
import type { Company, User } from '@/models';
import { rolePermissionService } from '@/models/role-permission';
import { ProfileFields, profileFromUser, type ProfileValues } from '@/components/account/ProfileFields';

export interface UserFormValues extends ProfileValues {
  email: string;
  role: User['role'];
  companyId: string;
  password: string;
  isActive: boolean;
}

export function userToForm(u?: User): UserFormValues {
  return {
    ...profileFromUser(u),
    email: u?.email ?? '',
    role: u?.role ?? 'manager',
    companyId: u?.companyId != null ? String(u.companyId) : '',
    password: '',
    isActive: u?.isActive ?? true,
  };
}

/** Used only until the role list (roles table) has loaded. */
export const ROLE_OPTIONS: Array<{ value: User['role']; label: string }> = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'auditor', label: 'Auditor — read only' },
  { value: 'user', label: 'User' },
  { value: 'company_a', label: 'Company A — sender' },
  { value: 'company_b', label: 'Company B — receiver' },
];

export function UserForm({
  defaultValues, onSubmit, loading, submitLabel = 'Save', isNew, isSelf, userCode,
}: {
  defaultValues: UserFormValues;
  onSubmit: (v: UserFormValues) => void | Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  isNew?: boolean;
  /** Admins cannot deactivate or change the role of their own account. */
  isSelf?: boolean;
  /** Shown read-only when editing; it is generated when the account is created. */
  userCode?: string | null;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<UserFormValues>({ defaultValues });
  const companies = useAsync<Company[]>(async () => (await companiesApi.list()).data.data, []);
  const role = watch('role');
  const roles = useAsync(() => rolePermissionService.list(), []);
  const roleOptions = roles.data ? roles.data.map((r) => ({ value: r.key, label: r.name })) : ROLE_OPTIONS;

  return (
    <Form post onSubmit={handleSubmit(onSubmit)} loading={loading} submitLabel={submitLabel}>
      <ProfileFields register={register} errors={errors} watch={watch} />

      <h3 className="form-section">Account</h3>
      <Grid cols={2}>
        <Field label="Email" required error={errors.email?.message}>
          <input type="email" className="form-input" disabled={!isNew}
            {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
        </Field>
        <Field label="User code" hint={isNew ? 'Generated when the account is created' : undefined}>
          <input className="form-input" disabled readOnly value={userCode ?? (isNew ? 'Auto-generated' : '—')} />
        </Field>
      </Grid>
      <Grid cols={2}>
        <Field label="Role" hint={isSelf ? 'You cannot change your own role' : undefined}>
          <select className="form-input" disabled={isSelf} {...register('role')}>
            {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
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
      <Field label={isNew ? 'Temporary password' : 'New temporary password'} error={errors.password?.message}
        hint={isNew
          ? 'Leave blank to generate one. It is shown once after saving; the user must change it at first sign-in.'
          : 'Leave blank to keep the current password. A new one is temporary: the user must change it at next sign-in.'}>
        <input type="password" autoComplete="new-password" className="form-input"
          {...register('password', {
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
