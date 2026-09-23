import { useState, FormEvent } from 'react';
import { AppUser, UserRole } from '../types';
import { supabase } from '../supabaseClient';
import {
  Shield, Users, Check, Lock,
  UserPlus, Settings, Key, Trash2, KeyRound
} from 'lucide-react';

interface UserRoleManagementProps {
  currentUser: AppUser;
  usersList: AppUser[];
  onAddUser: (user: { name: string; email: string; role: UserRole; department?: string; password: string }) => Promise<void>;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onDeleteUser: (userId: string) => void;
}

export default function UserRoleManagement({
  currentUser,
  usersList,
  onAddUser,
  onUpdateUserRole,
  onDeleteUser
}: UserRoleManagementProps) {
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('viewer');
  const [formDept, setFormDept] = useState('Operations');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Account management is admin-only, both here and on the backend.
  const canManageRoles = currentUser.role === 'admin';
  const canAddUser = currentUser.role === 'admin';

  const roleDetails: Record<UserRole, {
    name: string; desc: string; color: string; icon: typeof Shield;
    modules: string[]; actions: string[];
  }> = {
    admin: {
      name: 'Administrator',
      desc: 'Absolute access across all modules, GPS hardware, and account management.',
      color: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: Shield,
      modules: ['Live Tracking Map', 'Operational Dashboard', 'Logistics Inventory', 'Driver Performance', 'Fleet Directory', 'GPS Hardware Register', 'User & Role Center'],
      actions: ['Full Read/Write/Delete', 'Manage Accounts & Roles', 'Provision GPS Transceivers']
    },
    manager: {
      name: 'Fleet Manager',
      desc: 'Operational access to fleet, routes, drivers, and inventory. Cannot manage GPS hardware or user accounts.',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: Key,
      modules: ['Live Tracking Map', 'Operational Dashboard', 'Logistics Inventory', 'Driver Performance', 'Fleet Directory'],
      actions: ['Read & Write Operational Data', 'Edit Driver Scorecards', 'Resolve Alerts', 'Assign Cargo Loads']
    },
    viewer: {
      name: 'Viewer',
      desc: 'Read-only access for auditors, guests, or executive dashboards. All write actions are hidden and blocked.',
      color: 'bg-slate-100 text-slate-800 border-slate-200',
      icon: Lock,
      modules: ['Live Tracking Map', 'Operational Dashboard', 'Driver Performance'],
      actions: ['View Diagnostic Analytics', 'Observe Live GPS Locations']
    }
  };

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName || !formEmail || !formPassword) return;
    if (formPassword.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    setIsAddingUser(true);
    try {
      await onAddUser({
        name: formName,
        email: formEmail,
        role: formRole,
        department: formDept,
        password: formPassword
      });

      setFormName('');
      setFormEmail('');
      setFormRole('viewer');
      setFormDept('Operations');
      setFormPassword('');
      setShowAddUserModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally {
      setIsAddingUser(false);
    }
  };

  // --- CHANGE MY OWN PASSWORD (any role, self-service) ---
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (!supabase) {
      setPasswordError('Supabase is not configured.');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPasswordSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => {
      setShowChangePasswordModal(false);
      setPasswordSuccess(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. SIGNED-IN ACCOUNT SUMMARY */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400 shrink-0" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-600 border-2 border-indigo-400 shrink-0 flex items-center justify-center text-sm font-black text-white">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h5 className="text-sm font-extrabold text-slate-100 truncate">{currentUser.name}</h5>
            <p className="text-[10px] text-slate-400 font-medium truncate">{currentUser.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2.5 py-1 rounded-full border border-indigo-500/30">
            Signed in as <span className="text-white font-extrabold uppercase">{currentUser.role}</span>
          </span>
          <button
            id="btn-change-password"
            onClick={() => setShowChangePasswordModal(true)}
            className="flex items-center gap-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2.5 py-1 rounded-full border border-slate-700 transition"
          >
            <KeyRound className="w-3 h-3" /> Change Password
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* 2. SECURITY PRIVILEGE & MODULES MATRIX */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Role-Based Access Control Matrix</h4>
                <p className="text-[10px] text-slate-400 font-semibold">Strict policy mappings defining visible modules and allowed interactions per role group.</p>
              </div>
            </div>

            {/* Matrix details */}
            <div className="grid gap-3.5">
              {(Object.keys(roleDetails) as UserRole[]).map((r) => {
                const det = roleDetails[r];
                const IconComponent = det.icon;
                const isCurrentRole = currentUser.role === r;

                return (
                  <div 
                    key={r}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrentRole 
                        ? 'bg-indigo-50/40 border-indigo-200/80 shadow-sm' 
                        : 'bg-slate-50/50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl border mt-0.5 ${det.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                            {det.name}
                            {isCurrentRole && (
                              <span className="text-[8px] font-black uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
                                Your Current Role
                              </span>
                            )}
                          </h5>
                          <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">{det.desc}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3.5 border-t border-slate-100">
                      {/* Allowed Modules */}
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Authorized Modules</span>
                        <div className="flex flex-wrap gap-1">
                          {det.modules.map((m) => (
                            <span key={m} className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200/50">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Privileges */}
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Granted Operations</span>
                        <div className="flex flex-wrap gap-1">
                          {det.actions.map((a) => (
                            <span key={a} className="text-[9px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100/50 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 text-blue-500 stroke-[3]" /> {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. OPERATORS USER REGISTER LIST */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">System Operators</h4>
                  <p className="text-[10px] text-slate-400 font-semibold">Authorized dispatchers and officers.</p>
                </div>
              </div>

              {canAddUser ? (
                <button
                  id="btn-add-operator"
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Operator
                </button>
              ) : (
                <span className="text-[9px] bg-slate-50 border border-slate-100 text-slate-400 font-mono font-bold px-2 py-1 rounded-lg">
                  Add Locked 🔒
                </span>
              )}
            </div>

            {/* Users listing */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {usersList.map((user) => {
                const details = roleDetails[user.role];
                const isSelf = currentUser.id === user.id;

                return (
                  <div 
                    key={user.id} 
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      isSelf ? 'border-indigo-150 bg-indigo-50/20' : 'border-slate-100 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-200 shrink-0 flex items-center justify-center text-xs font-black text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs text-slate-800 truncate block">{user.name}</span>
                          {isSelf && (
                            <span className="bg-slate-900 text-white font-black text-[7px] uppercase px-1 rounded">YOU</span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono truncate block">{user.email}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[8px] text-slate-400 font-semibold">{user.department}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className={`text-[8px] font-black uppercase ${details.color} px-1.5 rounded-md`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Manage Role button (only clickable by Admins, and can't delete self) */}
                    {canManageRoles && !isSelf && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Inline Role select toggle */}
                        <select
                          value={user.role}
                          onChange={(e) => onUpdateUserRole(user.id, e.target.value as UserRole)}
                          className="bg-white border border-slate-200 rounded-lg p-1 text-[9px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="viewer">Viewer</option>
                        </select>

                        <button
                          id={`btn-delete-operator-${user.id}`}
                          onClick={() => onDeleteUser(user.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                          title="Remove Operator"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* --- ADD USER MODAL --- */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scale-up border border-slate-100">
            <div className="flex gap-3 text-slate-800">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl h-fit">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Add New Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">Creates a real login — they can sign in immediately with this email and password.</p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Full Name</label>
                <input
                  id="form-user-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Nurul Farhana"
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Email Address</label>
                <input
                  id="form-user-email"
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. farhana@tangerangfleet.co.id"
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Initial Password</label>
                <input
                  id="form-user-password"
                  type="text"
                  required
                  minLength={8}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400">Share this with them directly — they can change it after signing in.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">Department</label>
                  <input
                    id="form-user-dept"
                    type="text"
                    required
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    placeholder="e.g. Flight Ops"
                    className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">Role Privilege Group</label>
                  <select
                    id="form-user-role"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="p-2.5 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-rose-600 font-semibold">{formError}</p>
              )}

              <div className="flex justify-end gap-2 text-xs pt-3">
                <button
                  id="form-btn-cancel"
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
                >
                  Discard
                </button>
                <button
                  id="form-btn-save"
                  type="submit"
                  disabled={isAddingUser}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-lg transition"
                >
                  {isAddingUser ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CHANGE PASSWORD MODAL --- */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scale-up border border-slate-100">
            <div className="flex gap-3 text-slate-800">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl h-fit">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">Updates the password for {currentUser.email}.</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {passwordError && <p className="text-rose-600 font-semibold">{passwordError}</p>}
              {passwordSuccess && <p className="text-emerald-600 font-semibold">Password updated.</p>}

              <div className="flex justify-end gap-2 text-xs pt-3">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg transition"
                >
                  {changingPassword ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
