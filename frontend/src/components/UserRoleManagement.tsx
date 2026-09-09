import { useState, FormEvent } from 'react';
import { AppUser, UserRole } from '../types';
import { 
  Shield, Fingerprint, Users, Check, X, Lock, Unlock, 
  UserPlus, Settings, Key, RefreshCw, UserCheck, Trash2, Edit3 
} from 'lucide-react';

interface UserRoleManagementProps {
  currentUser: AppUser;
  onSwitchUser: (user: AppUser) => void;
  usersList: AppUser[];
  onAddUser: (user: Omit<AppUser, 'id'>) => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onDeleteUser: (userId: string) => void;
}

export default function UserRoleManagement({
  currentUser,
  onSwitchUser,
  usersList,
  onAddUser,
  onUpdateUserRole,
  onDeleteUser
}: UserRoleManagementProps) {
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('user');
  const [formDept, setFormDept] = useState('Operations');

  const canManageRoles = currentUser.role === 'administrator';
  const canAddUser = currentUser.role === 'administrator' || currentUser.role === 'supervisor';

  const roleDetails = {
    administrator: {
      name: 'System Administrator',
      desc: 'Absolute access across all modules, GPS hardware, database settings, and access control models.',
      color: 'bg-rose-100 text-rose-800 border-rose-200',
      badgeColor: 'bg-rose-500',
      icon: Shield,
      modules: ['Live Tracking Map', 'Operational Dashboard', 'Logistics Inventory', 'Driver Performance', 'Fleet Directory', 'GPS Hardware Register', 'User & Role Center'],
      actions: ['Full Read/Write/Delete', 'Modify Access Privileges', 'Simulate Telematics Anomalies', 'Provision GPS Transceivers']
    },
    supervisor: {
      name: 'Fleet Operations Supervisor',
      desc: 'High-level operational supervisor. Manages routes, drivers, and cargo manifests. Read-only on raw hardware configurations.',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      badgeColor: 'bg-indigo-500',
      icon: Key,
      modules: ['Live Tracking Map', 'Operational Dashboard', 'Logistics Inventory', 'Driver Performance', 'Fleet Directory', 'User & Role Center'],
      actions: ['Read & Write Operations', 'Edit Driver Scorecards', 'Acknowledge Telematics Alerts', 'Assign Cargo Loads']
    },
    user: {
      name: 'Dispatch Operator',
      desc: 'Standard workspace dispatcher. Focuses on route status tracking and logging inventory. Limited creation privileges.',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      badgeColor: 'bg-emerald-500',
      icon: Unlock,
      modules: ['Live Tracking Map', 'Operational Dashboard', 'Logistics Inventory'],
      actions: ['Add & Edit Inventory', 'View Active Geofences', 'Track Current Journeys']
    },
    viewer: {
      name: 'Auditor / Guest Viewer',
      desc: 'Read-only access for corporate auditors, regulatory inspectors, or executive dashboards. All write buttons are hidden.',
      color: 'bg-slate-100 text-slate-800 border-slate-200',
      badgeColor: 'bg-slate-500',
      icon: Lock,
      modules: ['Live Tracking Map', 'Operational Dashboard', 'Driver Performance'],
      actions: ['View Diagnostic Analytics', 'Observe Live GPS Locations', 'Export CSV Logs']
    }
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;

    onAddUser({
      name: formName,
      email: formEmail,
      role: formRole,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=120&auto=format&fit=crop&q=80`,
      department: formDept
    });

    setFormName('');
    setFormEmail('');
    setFormRole('user');
    setFormDept('Operations');
    setShowAddUserModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. DEMO CONTROLS: INSTANT ROLE SWITCHING TOOLBAR */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm tracking-wide uppercase flex items-center gap-2 text-indigo-400">
              <Fingerprint className="w-5 h-5 text-indigo-400" /> Demo Identity Switchboard
            </h4>
            <p className="text-xs text-slate-300">
              Click any profile card below to quickly switch the active session user and watch the sidebar modules, navigation controls, and edit constraints adapt instantly.
            </p>
          </div>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2.5 py-1 rounded-full border border-indigo-500/30">
            Active Identity: <span className="text-white font-extrabold uppercase">{currentUser.role}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {usersList.slice(0, 4).map((user) => {
            const isSelf = currentUser.id === user.id;
            const details = roleDetails[user.role];
            return (
              <button
                key={user.id}
                id={`profile-switch-btn-${user.id}`}
                onClick={() => onSwitchUser(user)}
                className={`text-left p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3 relative overflow-hidden group ${
                  isSelf 
                    ? 'bg-slate-800/80 border-indigo-400/80 shadow-md ring-1 ring-indigo-400/50' 
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                {isSelf && (
                  <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-400 rounded-bl-lg flex items-center justify-center">
                    <Check className="w-2 h-2 text-slate-950 stroke-[3]" />
                  </div>
                )}
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className={`w-9 h-9 rounded-full object-cover border-2 shrink-0 ${
                    isSelf ? 'border-indigo-400' : 'border-slate-800'
                  }`}
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <h5 className="text-xs font-extrabold text-slate-100 truncate group-hover:text-indigo-200 transition">
                    {user.name}
                  </h5>
                  <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">{user.email}</p>
                  <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1.5 ${details.color}`}>
                    {user.role}
                  </span>
                </div>
              </button>
            );
          })}
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
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
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
                          <option value="administrator">Admin</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="user">User</option>
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
                <h3 className="font-bold text-sm text-slate-900">Add New Operator</h3>
                <p className="text-xs text-slate-500 mt-0.5">Authorize a new officer with explicit workspace roles.</p>
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
                    <option value="administrator">Administrator</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="user">User (Dispatcher)</option>
                    <option value="viewer">Viewer (Auditor)</option>
                  </select>
                </div>
              </div>

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
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                >
                  Authorize Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
