'use client';

/**
 * The personal, contact, work and address inputs shared by the admin "New user" form and the public Register page.
 * 14 inputs: first name, last name, date of birth, gender, blood group, mobile, alternate mobile, designation,
 * pincode, state, district, city, landmark, address.
 */
import type { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import { Field, Grid } from '@/components/ui';

export interface ProfileValues {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  mobile: string;
  alternateMobile: string;
  designation: string;
  pincode: string;
  state: string;
  district: string;
  city: string;
  landmark: string;
  address: string;
}

export const GENDERS = ['Male', 'Female', 'Other'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export const emptyProfile = (): ProfileValues => ({
  firstName: '', lastName: '', dateOfBirth: '', gender: '', bloodGroup: '', mobile: '', alternateMobile: '',
  designation: '', pincode: '', state: '', district: '', city: '', landmark: '', address: '',
});

/** Fill the profile inputs from a saved user (older accounts only have a single full name). */
export function profileFromUser(u?: Partial<Record<keyof ProfileValues | 'name', string | null>>): ProfileValues {
  const parts = (u?.name ?? '').trim().split(/\s+/);
  return {
    firstName: u?.firstName ?? (u?.name ? parts[0] : ''),
    lastName: u?.lastName ?? (u?.name && parts.length > 1 ? parts.slice(1).join(' ') : ''),
    dateOfBirth: u?.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : '',
    gender: u?.gender ?? '',
    bloodGroup: u?.bloodGroup ?? '',
    mobile: u?.mobile ?? '',
    alternateMobile: u?.alternateMobile ?? '',
    designation: u?.designation ?? '',
    pincode: u?.pincode ?? '',
    state: u?.state ?? '',
    district: u?.district ?? '',
    city: u?.city ?? '',
    landmark: u?.landmark ?? '',
    address: u?.address ?? '',
  };
}

/**
 * What to send to the API. When creating, blanks are left out; when editing (`clear`), blanks are sent as '' so an
 * existing value can be removed.
 */
export function profilePayload(v: ProfileValues, clear = false) {
  const out: Record<string, string | undefined> = {};
  (Object.keys(v) as Array<keyof ProfileValues>).forEach((k) => {
    const t = (v[k] ?? '').trim();
    out[k] = t === '' ? (clear ? '' : undefined) : t;
  });
  return out;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

type Props<T extends ProfileValues> = {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  watch: UseFormWatch<T>;
  /** Registration asks for fewer required details than an administrator-created account. */
  requireMobile?: boolean;
};

export function ProfileFields<T extends ProfileValues>({ register: reg, errors: errs, watch: w, requireMobile = true }: Props<T>) {
  // The form hooks are generic over the caller's values; these inputs only ever touch ProfileValues keys.
  const register = reg as unknown as UseFormRegister<ProfileValues>;
  const errors = errs as FieldErrors<ProfileValues>;
  const watch = w as unknown as UseFormWatch<ProfileValues>;

  return (
    <>
      <h3 className="form-section">Personal details</h3>
      <Grid cols={2}>
        <Field label="First name" required error={errors.firstName?.message}>
          <input className="form-input" autoComplete="given-name"
            {...register('firstName', { required: 'First name is required', maxLength: { value: 60, message: 'Max 60 characters' } })} />
        </Field>
        <Field label="Last name" error={errors.lastName?.message}>
          <input className="form-input" autoComplete="family-name" {...register('lastName', { maxLength: { value: 60, message: 'Max 60 characters' } })} />
        </Field>
      </Grid>
      <Grid cols={3}>
        <Field label="Date of birth" error={errors.dateOfBirth?.message}>
          <input type="date" className="form-input" max={todayIso()}
            {...register('dateOfBirth', { validate: (v) => !v || v <= todayIso() || 'Date of birth cannot be in the future' })} />
        </Field>
        <Field label="Gender">
          <select className="form-input" {...register('gender')}>
            <option value="">Select...</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Blood group">
          <select className="form-input" {...register('bloodGroup')}>
            <option value="">Select...</option>
            {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
      </Grid>

      <h3 className="form-section">Contact and work</h3>
      <Grid cols={3}>
        <Field label="Mobile" required={requireMobile} error={errors.mobile?.message} hint="10 digits">
          <input inputMode="numeric" maxLength={10} className="form-input" autoComplete="tel"
            {...register('mobile', {
              required: requireMobile ? 'Mobile number is required' : false,
              pattern: { value: MOBILE_PATTERN, message: 'Enter a valid 10-digit mobile number' },
            })} />
        </Field>
        <Field label="Alternate mobile" error={errors.alternateMobile?.message}>
          <input inputMode="numeric" maxLength={10} className="form-input"
            {...register('alternateMobile', {
              pattern: { value: MOBILE_PATTERN, message: 'Enter a valid 10-digit mobile number' },
              validate: (v) => !v || v !== watch('mobile') || 'Must be different from the mobile number',
            })} />
        </Field>
        <Field label="Designation" error={errors.designation?.message}>
          <input className="form-input" placeholder="Store manager" {...register('designation', { maxLength: { value: 100, message: 'Max 100 characters' } })} />
        </Field>
      </Grid>

      <h3 className="form-section">Address</h3>
      <Grid cols={3}>
        <Field label="Pincode" error={errors.pincode?.message}>
          <input inputMode="numeric" maxLength={6} className="form-input" autoComplete="postal-code"
            {...register('pincode', { pattern: { value: /^\d{6}$/, message: 'Pincode must be 6 digits' } })} />
        </Field>
        <Field label="State">
          <input className="form-input" autoComplete="address-level1" {...register('state')} />
        </Field>
        <Field label="District">
          <input className="form-input" {...register('district')} />
        </Field>
      </Grid>
      <Grid cols={2}>
        <Field label="City / town">
          <input className="form-input" autoComplete="address-level2" {...register('city')} />
        </Field>
        <Field label="Landmark">
          <input className="form-input" {...register('landmark')} />
        </Field>
      </Grid>
      <Field label="Address" error={errors.address?.message}>
        <textarea className="form-input" rows={2} style={{ resize: 'none' }} autoComplete="street-address"
          {...register('address', { maxLength: { value: 500, message: 'Max 500 characters' } })} />
      </Field>
    </>
  );
}
