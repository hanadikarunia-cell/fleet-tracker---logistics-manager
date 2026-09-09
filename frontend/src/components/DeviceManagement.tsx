import { useState, FormEvent } from 'react';
import { GPSDevice, Vehicle } from '../types';
import { 
  Cpu, Plus, Edit, Trash2, CheckCircle, AlertTriangle, 
  Battery, Wifi, Eye, RefreshCw, Radio, ShieldCheck
} from 'lucide-react';

interface DeviceManagementProps {
  devices: GPSDevice[];
  vehicles: Vehicle[];
  userRole?: string;
  onAddDevice: (device: GPSDevice) => void;
  onEditDevice: (id: string, updated: Partial<GPSDevice>) => void;
  onDeleteDevice: (id: string) => void;
}

export default function DeviceManagement({
  devices,
  vehicles,
  userRole,
  onAddDevice,
  onEditDevice,
  onDeleteDevice,
}: DeviceManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);

  // Form states
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formImei, setFormImei] = useState('');
  const [formStatus, setFormStatus] = useState<'online' | 'offline' | 'low_battery'>('online');
  const [formBattery, setFormBattery] = useState(100);
  const [formSignal, setFormSignal] = useState<'excellent' | 'good' | 'fair' | 'poor'>('excellent');
  const [formVehicleId, setFormVehicleId] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formId || !formName || !formImei) return;

    const devicePayload: GPSDevice = {
      id: formId,
      name: formName,
      imei: formImei,
      status: formStatus,
      batteryLevel: Number(formBattery),
      signalStrength: formSignal,
      assignedVehicleId: formVehicleId || undefined,
      lastPing: new Date().toISOString(),
    };

    if (editingDeviceId) {
      onEditDevice(editingDeviceId, devicePayload);
      setEditingDeviceId(null);
    } else {
      // Check if ID is unique
      if (devices.some(d => d.id === formId)) {
        alert('Device Hardware ID already exists!');
        return;
      }
      onAddDevice(devicePayload);
    }

    resetForm();
  };

  const startEdit = (device: GPSDevice) => {
    setEditingDeviceId(device.id);
    setFormId(device.id);
    setFormName(device.name);
    setFormImei(device.imei);
    setFormStatus(device.status);
    setFormBattery(device.batteryLevel);
    setFormSignal(device.signalStrength);
    setFormVehicleId(device.assignedVehicleId || '');
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormId('');
    setFormName('');
    setFormImei('');
    setFormStatus('online');
    setFormBattery(100);
    setFormSignal('excellent');
    setFormVehicleId('');
    setShowAddForm(false);
  };

  const getSignalIcon = (strength: string) => {
    switch (strength) {
      case 'excellent': return '🟢 Excellent (5G)';
      case 'good': return '🟢 Good (4G LTE)';
      case 'fair': return '🟡 Fair (3G)';
      case 'poor': return '🔴 Poor (2G)';
      default: return '🔴 Unknown';
    }
  };

  const getBatteryColor = (level: number) => {
    if (level <= 15) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (level <= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      {/* Read-Only Status Alert */}
      {userRole === 'viewer' && (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 px-4 py-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-sm">
          <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0" />
          <span>🔒 READ-ONLY AUDITOR MODE: You are signed in as a Viewer. Device specifications, signal diagnostic controls, and hardware configs are locked from modifications.</span>
        </div>
      )}

      {/* 1. HEADER FLOW CONTROL */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg h-fit">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-blue-900">GPS Hardware Register</h4>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              Register active telemetry hardware, tie them to vehicles via IMEI records, and check signal diagnostic integrity.
            </p>
          </div>
        </div>
        {userRole !== 'viewer' ? (
          <button
            id="btn-add-device-toggle"
            onClick={() => { resetForm(); setShowAddForm(!showAddForm); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add GPS Tracker
          </button>
        ) : (
          <button
            id="btn-add-device-toggle-disabled"
            disabled
            className="flex items-center gap-2 bg-slate-200 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold shrink-0 cursor-not-allowed"
            title="Read-only access"
          >
            🔒 Actions Locked
          </button>
        )}
      </div>

      {/* 2. FORM DRAWER / CARD */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4 animate-fade-in">
          <h3 className="font-bold text-sm text-slate-800">
            {editingDeviceId ? '✏️ Configure GPS Tracker Hardware' : '📡 Register New IMEI Device'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">Hardware ID / Alias *</label>
              <input
                id="form-device-id"
                type="text"
                required
                disabled={!!editingDeviceId}
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="e.g. GPS-107"
                className="p-2 border border-slate-200 rounded-lg text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">Device Description *</label>
              <input
                id="form-device-name"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Asset Magnet Tracker V2"
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">IMEI Hardware Serial *</label>
              <input
                id="form-device-imei"
                type="text"
                required
                value={formImei}
                onChange={(e) => setFormImei(e.target.value)}
                placeholder="e.g. 860432049102900"
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">Ping Diagnostics Status</label>
              <select
                id="form-device-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="online">Online & Synced</option>
                <option value="offline">Offline / Dormant</option>
                <option value="low_battery">Battery Critical Alert</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">Hardware Battery Level (%)</label>
              <input
                id="form-device-battery"
                type="number"
                min="0"
                max="100"
                value={formBattery}
                onChange={(e) => setFormBattery(Number(e.target.value))}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">Telemetry Signal Quality</label>
              <select
                id="form-device-signal"
                value={formSignal}
                onChange={(e) => setFormSignal(e.target.value as any)}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="excellent">Excellent (GNSS Triangulated)</option>
                <option value="good">Good (Dual-Band Cell)</option>
                <option value="fair">Fair (LBS Fallback)</option>
                <option value="poor">Poor / Cell Jammed</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 md:col-span-3">
              <label className="font-semibold text-slate-600">Assign to Active Vehicle (Optional)</label>
              <select
                id="form-device-vehicle"
                value={formVehicleId}
                onChange={(e) => setFormVehicleId(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Do Not Assign (Leave in Hardware Cache)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    🚚 {v.name} ({v.licensePlate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 text-xs pt-2">
            <button
              id="device-form-cancel"
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              id="device-form-save"
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
            >
              {editingDeviceId ? 'Save Config' : 'Register Device'}
            </button>
          </div>
        </form>
      )}

      {/* 3. DEVICE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => {
          const matchedVehicle = vehicles.find((v) => v.id === device.assignedVehicleId);
          const isLow = device.batteryLevel <= 20 || device.status === 'low_battery';
          const isOffline = device.status === 'offline';

          return (
            <div 
              key={device.id} 
              className={`p-5 rounded-2xl border bg-white shadow-sm flex flex-col justify-between space-y-4 hover:shadow transition-all ${
                isLow 
                  ? 'border-rose-100 ring-1 ring-rose-200 bg-rose-50/10' 
                  : 'border-slate-100'
              }`}
            >
              <div className="space-y-3">
                {/* ID & Status Line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-extrabold text-xs text-slate-500 font-mono tracking-wider">{device.id}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border ${
                    isOffline 
                      ? 'bg-slate-100 text-slate-500 border-slate-200' 
                      : isLow 
                        ? 'bg-rose-100 text-rose-700 border-rose-200' 
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse'
                  }`}>
                    {device.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-bold text-sm text-slate-800 leading-tight">{device.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-semibold">IMEI: {device.imei}</p>
                </div>

                {/* Battery & Signal Badges */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded-xl border flex items-center justify-between text-[10px] ${getBatteryColor(device.batteryLevel)}`}>
                    <div className="flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-semibold">Battery</span>
                    </div>
                    <span className="font-extrabold font-mono">{device.batteryLevel}%</span>
                  </div>

                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-[10px] text-slate-600">
                    <div className="flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="font-semibold font-mono">Signal</span>
                    </div>
                    <span className="font-bold truncate max-w-[50px]">{device.signalStrength.toUpperCase()}</span>
                  </div>
                </div>

                {/* Assigned Vehicle */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Assigned Fleet Resource</p>
                  {matchedVehicle ? (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate max-w-[150px]">{matchedVehicle.name}</span>
                      <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                        {matchedVehicle.licensePlate}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-bold text-[10px] uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> UNASSIGNED HARDWARE
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-1 border-t border-slate-50 pt-3">
                {userRole !== 'viewer' ? (
                  <>
                    <button
                      id={`btn-edit-device-${device.id}`}
                      onClick={() => startEdit(device)}
                      className="px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" /> Config
                    </button>
                    <button
                      id={`btn-delete-device-${device.id}`}
                      onClick={() => onDeleteDevice(device.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title="Unregister Hardware"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
                    🔒 Locked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
