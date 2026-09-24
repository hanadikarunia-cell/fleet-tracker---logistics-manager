import { useEffect, useState, FormEvent } from 'react';
import { PlatformAdmin, PlatformAuditEntry } from '../types';
import { api } from '../api';
import { ShieldCheck, UserPlus, Trash2, X, ScrollText } from 'lucide-react';

interface PlatformAdminsPanelProps {
  admins: PlatformAdmin[];
  currentUserId: string;
  onAdd: (a: { name: string; email: string; password: string }) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
}

const actionLabels: Record<string, string> = {
  'tenant.create': 'Created tenant',
  'tenant.update': 'Updated tenant',
  'tenant.monitor': 'Monitored tenant',
  'tenant_user.create': 'Created tenant user',
  'tenant_user.update': 'Changed tenant user',
  'tenant_user.reset_password': 'Reset tenant user password',
  'platform_admin.create': 'Created platform admin',
  'platform_admin.remove': 'Removed platform admin',
};

export default function PlatformAdminsPanel({ admins, currentUserId, onAdd, onRemove }: PlatformAdminsPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<PlatformAdmin | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [audit, setAudit] = useState<PlatformAuditEntry[]>([]);

  const loadAudit = () => {
    api.platform.audit.list().then(setAudit).catch((err) => console.error('Failed to load audit log:', err));
  };
  useEffect(loadAudit, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    setIsAdding(true);
    try {
      await onAdd({ name, email: email.trim(), password });
      setName(''); setEmail(''); setPassword('');
      setShowAddModal(false);
      loadAudit();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create platform admin.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!pendingRemove) return;
    setRemoveError(null);
    setIsRemoving(true);
    try {
      await onRemove(pendingRemove.userId);
      setPendingRemove(null);
      loadAudit();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Failed to remove platform admin.');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg h-fit">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-blue-900">Platform Admins</h4>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              App-level operators. They manage tenants and tenant user accounts, and can monitor any tenant read-only —
              they can't change fleet data. Keep this list short.
            </p>
          </div>
        </div>
        <button
          id="btn-add-platform-admin"
          onClick={() => { setName(''); setEmail(''); setPassword(''); setFormError(null); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Add Platform Admin
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-400 font-bold uppercase tracking-wide text-[10px]">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Added</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.userId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-bold text-slate-800">
                  {a.name ?? '—'}
                  {a.userId === currentUserId && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold uppercase">You</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-slate-600">{a.email ?? '—'}</td>
                <td className="px-5 py-3.5 text-slate-600">
                  {a.tenantName ? (
                    <span title="A tenant account that also holds platform access. Create a platform-only login and remove this one to separate them.">
                      Also a user of {a.tenantName}
                    </span>
                  ) : (
                    'Platform only'
                  )}
                </td>
                <td className="px-5 py-3.5 text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3.5 text-right">
                  {a.userId !== currentUserId && (
                    <button
                      id={`btn-remove-platform-admin-${a.userId}`}
                      onClick={() => { setRemoveError(null); setPendingRemove(a); }}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title="Remove platform admin access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-semibold">No platform admins.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* AUDIT LOG */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-slate-400" />
          <h4 className="font-bold text-xs text-slate-800">Audit log</h4>
          <span className="text-[10px] text-slate-400 font-semibold">Latest 100 platform actions</span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-400 font-bold uppercase tracking-wide text-[10px]">
              <th className="px-5 py-2.5">When</th>
              <th className="px-5 py-2.5">Who</th>
              <th className="px-5 py-2.5">Action</th>
              <th className="px-5 py-2.5">Tenant</th>
              <th className="px-5 py-2.5">Target</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-5 py-2.5 text-slate-600">{r.actorEmail ?? '—'}</td>
                <td className="px-5 py-2.5 font-semibold text-slate-800">{actionLabels[r.action] ?? r.action}</td>
                <td className="px-5 py-2.5 text-slate-600">{r.tenantName ?? '—'}</td>
                <td className="px-5 py-2.5 text-slate-600">{r.target ?? '—'}</td>
              </tr>
            ))}
            {audit.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-400 font-semibold">Nothing recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Add Platform Admin</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Creates a platform-only login. It belongs to no tenant and has no fleet role of its own.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Full Name</label>
                <input
                  id="form-platform-admin-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Email</label>
                <input
                  id="form-platform-admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">Must not already be used by any account.</p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Initial Password</label>
                <input
                  id="form-platform-admin-password"
                  type="text"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {formError && <p className="text-rose-600 font-semibold">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-lg transition"
                >
                  {isAdding ? 'Creating…' : 'Create Platform Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE CONFIRM */}
      {pendingRemove && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">Remove platform admin?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {pendingRemove.name ?? pendingRemove.email} will lose app-level access immediately.{' '}
              {pendingRemove.tenantName
                ? 'Their tenant account and role stay as they are.'
                : 'This login has no tenant, so it will be deleted entirely.'}
            </p>
            {removeError && <p className="text-xs text-rose-600 font-semibold">{removeError}</p>}
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setPendingRemove(null)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold rounded-lg transition"
              >
                {isRemoving ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
