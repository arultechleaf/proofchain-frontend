'use client';

/**
 * VIEW — "By user": pick a user by name, tick the screens they may open (several at once) and how much they can do on
 * each one. Screens that match what the role gives are not stored; ticking more or fewer overrides the role for that user.
 */
import { CheckSquare, Save, Search, Square, Undo2, Users } from 'lucide-react';
import { Button, Card, EmptyState, Notice, SearchInput, Spinner } from '@/components/ui';
import { useUserAccessController } from '@/controllers/user-access.controller';
import { LEVEL_INFO, type AccessLevel } from '@/models/role-permission';
import { roleLabel } from '@/lib/utils';

const LEVELS: AccessLevel[] = ['read', 'own', 'full'];

export function UserAccessPanel() {
  const c = useUserAccessController();

  return (
    <div className="access-layout">
      {/* ── who ── */}
      <div className="access-users"><Card title="Users" icon={Users}>
        <SearchInput placeholder="Search name, email or code…" value={c.search} onChange={(e) => c.setSearch(e.target.value)} />
        {c.usersError ? <Notice kind="error">Could not load users.</Notice> : null}
        <div className="access-user-list" role="listbox" aria-label="Users">
          {c.usersLoading && <Spinner label="Loading users…" />}
          {c.users.map((u) => (
            <button
              key={u.id} type="button" role="option" aria-selected={c.selectedId === u.id}
              className={`access-user${c.selectedId === u.id ? ' active' : ''}${u.isActive ? '' : ' inactive'}`}
              onClick={() => c.select(u.id)}
            >
              <span className="access-user-name">{u.name}</span>
              <span className="access-user-meta">{roleLabel(u.role)}{u.userCode ? ` · ${u.userCode}` : ''}{u.isActive ? '' : ' · inactive'}</span>
            </button>
          ))}
          {!c.usersLoading && c.users.length === 0 && <p className="form-hint">No users match.</p>}
        </div>
      </Card></div>

      {/* ── which screens ── */}
      <div className="access-screens">
        {!c.selectedId && (
          <Card><EmptyState icon={Search} title="Choose a user on the left to set which screens they can open" /></Card>
        )}
        {c.selectedId && c.loading && <Card><Spinner label="Loading access…" /></Card>}
        {c.error ? <Notice kind="error">Could not load this user&apos;s access.</Notice> : null}

        {c.target && (
          <>
            <Card>
              <div className="access-head">
                <div>
                  <h2 className="card-title">{c.target.name}</h2>
                  <p className="form-hint">
                    {c.target.email} · role <strong>{roleLabel(c.target.role)}</strong> · {c.allowedCount} of {c.screens.length} screens allowed
                  </p>
                </div>
                <div className="access-actions">
                  <Button variant="secondary" size="sm" icon={CheckSquare} onClick={() => c.selectAll()}>Select all</Button>
                  <Button variant="secondary" size="sm" icon={Square} onClick={() => c.clearAll()}>Clear all</Button>
                  <Button variant="ghost" size="sm" icon={Undo2} onClick={c.resetToRole}>Use role defaults</Button>
                  {c.dirty > 0 && <Button variant="ghost" size="sm" onClick={c.discard}>Discard</Button>}
                  <Button size="sm" icon={Save} disabled={!c.dirty || c.saving} loading={c.saving} onClick={c.save}>
                    {c.dirty ? `Save ${c.dirty} change${c.dirty > 1 ? 's' : ''}` : 'Save'}
                  </Button>
                </div>
              </div>
              {c.message ? <Notice kind={c.message.kind}>{c.message.text}</Notice> : null}
            </Card>

            {c.groups.map((group) => {
              const rows = c.screens.filter((s) => s.group === group);
              return (
                <Card key={group} title={group} action={
                  <span className="access-group-actions">
                    <button type="button" className="btn btn-link btn-sm" onClick={() => c.selectAll(group)}>All</button>
                    <button type="button" className="btn btn-link btn-sm" onClick={() => c.clearAll(group)}>None</button>
                  </span>
                }>
                  <div className="access-rows">
                    {rows.map((s) => {
                      const level = c.levelOf(s);
                      const on = level !== 'none';
                      const locked = c.isLocked(s.key);
                      return (
                        <div key={s.key} className={`access-row${on ? ' on' : ''}`}>
                          <label className="access-check">
                            <input type="checkbox" checked={on} disabled={locked} onChange={(e) => c.toggle(s, e.target.checked)} aria-label={`Allow ${s.label}`} />
                            <span>
                              <strong>{s.label}</strong> <span className="text-muted">{s.path}</span>
                            </span>
                          </label>
                          <span className="access-role-default" title="What this user's role gives">
                            Role: <span style={{ color: LEVEL_INFO[s.roleLevel].color }}>{LEVEL_INFO[s.roleLevel].label}</span>
                          </span>
                          <select
                            className="form-input access-level" value={on ? level : ''} disabled={!on || locked} aria-label={`Access level for ${s.label}`}
                            onChange={(e) => c.setLevel(s, e.target.value as AccessLevel)}
                          >
                            {!on && <option value="">No access</option>}
                            {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_INFO[l].label}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
