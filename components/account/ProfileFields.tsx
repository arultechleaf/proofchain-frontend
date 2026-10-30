'use client';

/**
 * The personal, contact, work and address inputs shared by the admin "New user" form and the public Register page.
 * 14 inputs: first name, last name, date of birth, gender, blood group, mobile, alternate mobile, designation,
 * pincode, state, district, city, landmark, address.
 */
import { useState } from 'react';
import type { FieldErrors, Path, UseFormRegister, UseFormWatch } from 'react-hook-form';
import type { ComponentType } from 'react';
import { CitySelect as RawCitySelect, CountrySelect as RawCountrySelect, StateSelect as RawStateSelect } from 'react-country-state-city';
import type { City, Country, State } from 'react-country-state-city/dist/esm/types';
import { Field, Grid } from '@/components/ui';

// The library types its props as an intersection with the native input props, which rejects its own onChange/defaultValue.
type Loose = ComponentType<Record<string, unknown>>;
const CountrySelect = RawCountrySelect as unknown as Loose;
const StateSelect = RawStateSelect as unknown as Loose;
const CitySelect = RawCitySelect as unknown as Loose;

/** India's id in the country list the pickers load. */
const DEFAULT_COUNTRY = { id: 101, name: 'India' };

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
export const DESIGNATIONS = ['Admin', 'Manager', 'Auditor', 'Sender (Company A)', 'Receiver (Company B)', 'Store Manager', 'Accountant', 'Sales Executive', 'Delivery Staff', 'Staff'];
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
  // Only the profile keys: the register form passes its whole values (confirm, password...), which the API rejects.
  (Object.keys(emptyProfile()) as Array<keyof ProfileValues>).forEach((k) => {
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
  /** Show only some sections (the step-by-step sign-up uses this); all three by default. */
  sections?: ProfileSection[];
};

export type ProfileSection = 'personal' | 'contact' | 'address';

export function ProfileFields<T extends ProfileValues>({ register: reg, errors: errs, watch: w, requireMobile = true, sections }: Props<T>) {
  const show = (s: ProfileSection) => !sections || sections.includes(s);
  const [geo, setGeo] = useState({ countryId: DEFAULT_COUNTRY.id, stateId: 0 });
  // Write a value into the form through the field's own change handler (this component has no setValue).
  const setProfileValue = (name: 'state' | 'city', value: string) =>
    void reg(name as Path<T>).onChange({ target: { name, value }, type: 'change' });
  // The form hooks are generic over the caller's values; these inputs only ever touch ProfileValues keys.
  const register = reg as unknown as UseFormRegister<ProfileValues>;
  const errors = errs as FieldErrors<ProfileValues>;
  const watch = w as unknown as UseFormWatch<ProfileValues>;

  return (
    <>
      {show('personal') && (<>
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
      </>)}

      {show('contact') && (<>
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
          <select className="form-input" {...register('designation')}>
            <option value="">Select...</option>
            {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            {/* keep a saved value that is not in the list */}
            {(() => { const cur = watch('designation'); return cur && !DESIGNATIONS.includes(cur) ? <option value={cur}>{cur}</option> : null; })()}
          </select>
        </Field>
      </Grid>
      </>)}

      {show('address') && (<>
      <h3 className="form-section">Address</h3>
      <Grid cols={3}>
        <Field label="Pincode" error={errors.pincode?.message}>
          <input inputMode="numeric" maxLength={6} className="form-input" autoComplete="postal-code"
            {...register('pincode', { pattern: { value: /^\d{6}$/, message: 'Pincode must be 6 digits' } })} />
        </Field>
        <Field label="Country">
          <CountrySelect
            containerClassName="geo-select"
            inputClassName="form-input"
            defaultValue={{ id: DEFAULT_COUNTRY.id, name: DEFAULT_COUNTRY.name } as Country}
            placeHolder="Select country"
            showFlag={false}
            onChange={(c: Country) => { setGeo({ countryId: c.id, stateId: 0 }); setProfileValue('state', ''); setProfileValue('city', ''); }}
          />
        </Field>
        <Field label="State">
          <StateSelect
            key={`state-${geo.countryId}`}
            containerClassName="geo-select"
            inputClassName="form-input"
            countryid={geo.countryId}
            defaultValue={watch('state') ? ({ name: watch('state') } as unknown as State) : undefined}
            placeHolder="Select state"
            onChange={(s: State) => { setGeo((g) => ({ ...g, stateId: s.id })); setProfileValue('state', s.name); setProfileValue('city', ''); }}
          />
        </Field>
      </Grid>
      <Grid cols={2}>
        <Field label="City / town">
          <CitySelect
            key={`city-${geo.countryId}-${geo.stateId}`}
            containerClassName="geo-select"
            inputClassName="form-input"
            countryid={geo.countryId}
            stateid={geo.stateId}
            defaultValue={watch('city') ? ({ name: watch('city') } as unknown as City) : undefined}
            placeHolder="Select city"
            onChange={(c: City) => setProfileValue('city', c.name)}
          />
        </Field>
        <Field label="Landmark">
          <input className="form-input" {...register('landmark')} />
        </Field>
      </Grid>
      <Field label="Address" error={errors.address?.message}>
        <textarea className="form-input" rows={2} style={{ resize: 'none' }} autoComplete="street-address"
          {...register('address', { maxLength: { value: 500, message: 'Max 500 characters' } })} />
      </Field>
      </>)}
    </>
  );
}
