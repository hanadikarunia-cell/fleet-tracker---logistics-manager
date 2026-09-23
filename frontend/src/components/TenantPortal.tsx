import { useState, FormEvent } from 'react';
import { Tenant, TenantStatus } from '../types';
import { Building2, Plus, Pencil, Users, X } from 'lucide-react';

interface TenantPortalProps {
  tenants: Tenant[];
  onCreateTenant: (t: { name: string; subdomain: string; adminName: string; adminEmail: string; adminPassword: string }) => Promise<void>;
  onUpdateTenant: (id: string, t: { name?: string; status?: TenantStatus }) => Promise<void>;
}

const statusStyles: Record<TenantStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  suspended: 'bg-rose-100 text-rose-700 border-rose-200',
  trial: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function TenantPortal({ tenants, onCreateTenant, onUpdateTenant }: TenantPortalProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [formName, setFormName] = useState('');
  const [formSubdomain, setFormSubdomain] = useState('');
  const [formAdminName, setFormAdminName] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminPassword, setFormAdminPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<TenantStatus>('active');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const resetAddForm = () => {
    setFormName('');
    setFormSubdomain('');
    setFormAdminName('');
    setFormAdminEmail('');
    setFormAdminPassword('');
    setFormError(null);
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName || !formSubdomain || !formAdminName || !formAdminEmail || !formAdminPassword) return;
    if (formAdminPassword.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateTenant({
        name: formName,
        subdomain: formSubdomain.trim().toLowerCase(),
        adminName: formAdminName,
        adminEmail: formAdminEmail,
        adminPassword: formAdminPassword,
      });
      resetAddForm();
      setShowAddModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create tenant.');
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditName(tenant.name);
    setEditStatus(tenant.status);
    setEditError(null);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setEditError(null);
    setIsSavingEdit(true);
    try {
      await onUpdateTenant(editingTenant.id, { name: editName, status: editStatus });
      setEditingTenant(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update tenant.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg h-fit">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-blue-900">Tenant Portal</h4>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              Every company using Fleet Tracker. Each tenant is a separate workspace — users only ever see their own.
            </p>
          </div>
        </div>
        <button
          id="btn-add-tenant-toggle"
          onClick={() => { resetAddForm(); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Tenant
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-400 font-bold uppercase tracking-wide text-[10px]">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Users</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Created</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-bold text-slate-800">{tenant.name}</td>
                <td className="px-5 py-3.5 font-mono text-slate-500">{tenant.subdomain}</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                    <Users className="w-3 h-3 text-slate-400" /> {tenant.userCount}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusStyles[tenant.status]}`}>
                    {tenant.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-500">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    id={`btn-edit-tenant-${tenant.id}`}
                    onClick={() => startEdit(tenant)}
                    className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition cursor-pointer"
                    title="Edit tenant"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-semibold">No tenants yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NEW TENANT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex gap-3 text-slate-800">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl h-fit">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">New Tenant</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Creates the company and its first admin login together.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Company Name</label>
                <input
                  id="form-tenant-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Surabaya Freight Co"
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Code</label>
                <input
                  id="form-tenant-subdomain"
                  type="text"
                  required
                  value={formSubdomain}
                  onChange={(e) => setFormSubdomain(e.target.value)}
                  placeholder="e.g. surabaya-freight"
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">Lowercase letters, numbers, and hyphens only.</p>
              </div>

              <div className="border-t border-slate-100 pt-3.5 space-y-3.5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">First admin login</p>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">Full Name</label>
                  <input
                    id="form-tenant-admin-name"
                    type="text"
                    required
                    value={formAdminName}
                    onChange={(e) => setFormAdminName(e.target.value)}
                    className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">Email</label>
                  <input
                    id="form-tenant-admin-email"
                    type="email"
                    required
                    value={formAdminEmail}
                    onChange={(e) => setFormAdminEmail(e.target.value)}
                    className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">Initial Password</label>
                  <input
                    id="form-tenant-admin-password"
                    type="text"
                    required
                    minLength={8}
                    value={formAdminPassword}
                    onChange={(e) => setFormAdminPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="p-2.5 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400">Share this with them directly — they can change it after signing in.</p>
                </div>
              </div>

              {formError && <p className="text-rose-600 font-semibold">{formError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-lg transition"
                >
                  {isCreating ? 'Creating…' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TENANT MODAL */}
      {editingTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-sm text-slate-900">Edit {editingTenant.name}</h3>
              <button onClick={() => setEditingTenant(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Company Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TenantStatus)}
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {editError && <p className="text-rose-600 font-semibold">{editError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-lg transition"
                >
                  {isSavingEdit ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
