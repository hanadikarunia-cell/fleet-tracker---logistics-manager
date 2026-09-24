import { useEffect, useState, FormEvent } from 'react';
import { Tenant, TenantUser, UserRole } from '../types';
import { api } from '../api';
import { Users, UserPlus, KeyRound, X } from 'lucide-react';

interface TenantUsersModalProps {
  tenant: Tenant;
  onClose: () => void;
  // Lets the parent keep the Users count in the tenant list current after an add.
  onUserAdded: () => void;
}

const ROLES: UserRole[] = ['admin', 'manager', 'viewer'];

// Account management for one tenant — the recovery path if its admin is lost. Deliberately
// shows only who can log in, never any of the tenant's fleet data.
export default function TenantUsersModal({ tenant, onClose, onUserAdded }: TenantUsersModalProps) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [password, setPassword] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [resetting, setResetting] = useState<TenantUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState<string | null>(null);

  useEffect(() => {
    api.platform.tenantUsers
      .list(tenant.id)
      .then(setUsers)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load users.'));
  }, [tenant.id]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (password.length < 8) {
      setAddError('Password must be at least 8 characters.');
      return;
    }
    setIsAdding(true);
    try {
      const created = await api.platform.tenantUsers.create(tenant.id, { name, email: email.trim(), role, password });
      setUsers((prev) => [...prev, created]);
      setName(''); setEmail(''); setPassword(''); setRole('admin'); setShowAdd(false);
      onUserAdded();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (u: TenantUser, newRole: UserRole) => {
    setRowError(null);
    try {
      const updated = await api.platform.tenantUsers.update(tenant.id, u.id, { role: newRole });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'Failed to change role.');
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetting) return;
    setResetError(null);
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    setIsResetting(true);
    try {
      await api.platform.tenantUsers.resetPassword(tenant.id, resetting.id, newPassword);
      setResetDone(resetting.email);
      setResetting(null);
      setNewPassword('');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl h-fit">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{tenant.name} — user accounts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                For recovery: add an admin or reset a password if the tenant is locked out. Fleet data isn't shown here.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loadError && <p className="text-xs text-rose-600 font-semibold">{loadError}</p>}
        {rowError && <p className="text-xs text-rose-600 font-semibold">{rowError}</p>}
        {resetDone && (
          <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
            Password for {resetDone} was reset. Share the new password with them directly.
          </p>
        )}

        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-400 font-bold uppercase tracking-wide text-[10px]">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-bold text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setResetError(null); setResetDone(null); setNewPassword(''); setResetting(u); }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer font-semibold"
                      title="Reset password"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Reset password
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loadError && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 font-semibold">No users.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!showAdd ? (
          <button
            onClick={() => { setAddError(null); setShowAdd(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add user
          </button>
        ) : (
          <form onSubmit={handleAdd} className="border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">New user in {tenant.name}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                className="p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}
                className="p-2.5 border border-slate-200 rounded-lg bg-white">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input required minLength={8} placeholder="Initial password (8+ chars)" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-2.5 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {addError && <p className="text-rose-600 font-semibold">{addError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={isAdding}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-lg transition">
                {isAdding ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </form>
        )}

        {resetting && (
          <form onSubmit={handleReset} className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3 text-xs">
            <p className="font-bold text-amber-900">Reset password for {resetting.email}</p>
            <input required minLength={8} placeholder="New password (8+ chars)" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2.5 border border-amber-200 rounded-lg font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
            {resetError && <p className="text-rose-600 font-semibold">{resetError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetting(null)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={isResetting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold rounded-lg transition">
                {isResetting ? 'Resetting…' : 'Reset password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
