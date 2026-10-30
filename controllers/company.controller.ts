'use client';

/**
 * CONTROLLERS — the pages every business company has for itself:
 * profile, bank & invoice settings, branches / godowns and its own team.
 */
import { useState } from 'react';
import { useAsync } from '@/controllers/useAsync';
import { useAuth } from '@/lib/auth';
import { canWrite } from '@/lib/roles';
import { apiError } from '@/lib/utils';
import {
  blankBranch, branchToForm, companyService,
  type Branch, type BranchForm, type CompanyProfile, type CompanySettings, type TeamRole,
} from '@/models/company';
import type { User } from '@/models';

type Message = { kind: 'success' | 'error'; text: string } | null;

/** Profile: load once, save on submit. */
export function useCompanyProfileController() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync<CompanyProfile>(() => companyService.profile(), []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const save = async (values: Partial<CompanyProfile>) => {
    setSaving(true);
    setMessage(null);
    try {
      await companyService.saveProfile(values);
      setMessage({ kind: 'success', text: 'Company details saved' });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not save the company details') });
    } finally {
      setSaving(false);
    }
  };

  return { profile: data, loading, error: !!error, saving, message, save, writable: canWrite(user?.role) };
}

/** Bank details and invoice defaults. */
export function useCompanySettingsController() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync<CompanySettings>(() => companyService.settings(), []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const save = async (values: Partial<CompanySettings>) => {
    setSaving(true);
    setMessage(null);
    try {
      await companyService.saveSettings(values);
      setMessage({ kind: 'success', text: 'Settings saved' });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not save the settings') });
    } finally {
      setSaving(false);
    }
  };

  return { settings: data, loading, error: !!error, saving, message, save, writable: canWrite(user?.role) };
}

/** Branches and godowns: list, add, edit, delete. */
export function useBranchesController() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync<Branch[]>(() => companyService.branches(), []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BranchForm>(blankBranch());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const open = (b?: Branch) => {
    setMessage(null);
    setEditingId(b?.id ?? null);
    setForm(b ? branchToForm(b) : { ...blankBranch(), isDefault: (data ?? []).length === 0 });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const close = () => { setShowForm(false); setEditingId(null); };

  const submit = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await companyService.saveBranch(editingId, form);
      setMessage({ kind: 'success', text: editingId ? `Branch "${form.name}" updated` : `Branch "${form.name}" added` });
      close();
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not save the branch') });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Branch) => {
    setMessage(null);
    try {
      await companyService.removeBranch(b.id);
      setMessage({ kind: 'success', text: `Branch "${b.name}" deleted` });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not delete the branch') });
    }
  };

  return {
    rows: data ?? [], loading, error: !!error, writable: canWrite(user?.role),
    showForm, editingId, form, setForm, open, close, submit, remove, saving, message,
  };
}

/** The company's own people. */
export function useTeamController() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync<User[]>(() => companyService.team(), []);
  const roles = useAsync<TeamRole[]>(() => companyService.teamRoles(), []);
  const [message, setMessage] = useState<Message>(null);
  const [created, setCreated] = useState<{ name: string; email: string; userCode: string; temporaryPassword: string; passwordExpiryAt: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error2, setError] = useState('');

  const add = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError('');
    try {
      const m = await companyService.addMember(body) as { name: string; email: string; userCode: string; temporaryPassword: string; passwordExpiryAt: string | null };
      setCreated(m);
      await reload();
      return true;
    } catch (err) {
      setError(apiError(err, 'Could not add the person'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (m: User, isActive: boolean) => {
    setMessage(null);
    try {
      await companyService.updateMember(m.id, { isActive });
      setMessage({ kind: 'success', text: `${m.name} ${isActive ? 'activated' : 'deactivated'}` });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: apiError(err, 'Could not update the person') });
    }
  };

  return {
    rows: data ?? [], loading, error: !!error, roles: roles.data ?? [], me: user,
    writable: canWrite(user?.role), message, created, clearCreated: () => setCreated(null), saving, addError: error2, add, setActive,
  };
}
