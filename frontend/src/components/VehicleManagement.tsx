import { useState, FormEvent } from 'react';
import { Vehicle, GPSDevice, CustomRoute } from '../types';
import {
  Truck, Plus, Edit, Trash2, Smartphone, User, Phone,
  Weight, Sparkles, Navigation, CheckCircle, AlertTriangle, ShieldCheck, Milestone
} from 'lucide-react';
import { useLanguage } from '../i18n';

interface VehicleManagementProps {
  vehicles: Vehicle[];
  devices: GPSDevice[];
  userRole?: string;
  customRoutes?: CustomRoute[];
  onAddCustomRoute?: (route: CustomRoute) => void;
  onAddVehicle: (vehicle: Vehicle) => void;
  onEditVehicle: (id: string, updated: Partial<Vehicle>) => void;
  onDeleteVehicle: (id: string) => void;
}

const VEHICLE_COLORS = [
  { name: 'Nusantara Red', hex: '#E11D48' },
  { name: 'Sky Blue', hex: '#3B82F6' },
  { name: 'Emerald Green', hex: '#10B981' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Purple Star', hex: '#8B5CF6' },
  { name: 'Crimson Slate', hex: '#64748B' },
];

export default function VehicleManagement({
  vehicles,
  devices,
  userRole,
  customRoutes = [],
  onAddCustomRoute,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
}: VehicleManagementProps) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // Form states
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'Truck' | 'Van' | 'Sedan' | 'SUV' | 'Motorcycle'>('Truck');
  const [formPlate, setFormPlate] = useState('');
  const [formDeviceId, setFormDeviceId] = useState('');
  const [formDriver, setFormDriver] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formMaxWeight, setFormMaxWeight] = useState(3000);
  const [formColor, setFormColor] = useState('#E11D48');
  const [formRouteFrom, setFormRouteFrom] = useState('');
  const [formRouteTo, setFormRouteTo] = useState('');

  // Manual Route Modal state
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [newRouteTitle, setNewRouteTitle] = useState('');
  const [newRouteFrom, setNewRouteFrom] = useState('');
  const [newRouteTo, setNewRouteTo] = useState('');
  const [newRouteDesc, setNewRouteDesc] = useState('');
  const [newRouteCode, setNewRouteCode] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formId || !formName || !formPlate) return;

    const vehiclePayload: Vehicle = {
      id: formId,
      name: formName,
      type: formType,
      licensePlate: formPlate.toUpperCase(),
      deviceId: formDeviceId,
      status: 'stopped', // Default starting state
      speed: 0,
      lastUpdated: new Date().toISOString(),
      batteryPercent: 100,
      fuelLevel: 100,
      location: { lat: -6.1783, lng: 106.6319 }, // Starts at Tangerang HQ Depot
      bearing: 0,
      cargoWeight: 0,
      maxCargoWeight: Number(formMaxWeight),
      driverName: formDriver || 'Unassigned Driver',
      driverPhone: formPhone || '+62 812-0000-0000',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', // placeholder
      iconColor: formColor,
      odometer: editingVehicleId 
        ? (vehicles.find(v => v.id === editingVehicleId)?.odometer ?? 0) 
        : 0,
      engineHours: editingVehicleId 
        ? (vehicles.find(v => v.id === editingVehicleId)?.engineHours ?? 0) 
        : 0,
      routeFrom: formRouteFrom || 'Tangerang HQ Depot',
      routeTo: formRouteTo || 'CGK Airport Cargo Terminal',
    };

    if (editingVehicleId) {
      onEditVehicle(editingVehicleId, vehiclePayload);
      setEditingVehicleId(null);
    } else {
      if (vehicles.some(v => v.id === formId)) {
        alert(t('vm.idExistsAlert'));
        return;
      }
      onAddVehicle(vehiclePayload);
    }

    resetForm();
  };

  const handleSaveRouteToLibrary = (e: FormEvent) => {
    e.preventDefault();
    if (!newRouteTitle || !newRouteFrom || !newRouteTo) {
      alert(t('vm.routeRequiredAlert'));
      return;
    }

    const newId = `R-${Date.now().toString().slice(-4)}`;
    const parsedWaypoints = newRouteDesc ? newRouteDesc.split(',').map((item) => ({
      ptNode: item.trim(),
      code: item.trim().toUpperCase().slice(0, 3)
    })) : [];

    const newRoute: CustomRoute = {
      id: newId,
      title: newRouteTitle,
      from: newRouteFrom,
      to: newRouteTo,
      desc: newRouteDesc || 'Manually entered corridor route',
      code: newRouteCode || `MAN-${newId}`,
      waypoints: parsedWaypoints.length > 0 ? parsedWaypoints : [
        { ptNode: newRouteFrom.split(' ')[0] || newRouteFrom, code: newRouteFrom.toUpperCase().slice(0, 3) },
        { ptNode: newRouteTo.split(' ')[0] || newRouteTo, code: newRouteTo.toUpperCase().slice(0, 3) }
      ]
    };

    if (onAddCustomRoute) {
      onAddCustomRoute(newRoute);
    }
    
    // Auto-populate for this vehicle form
    setFormRouteFrom(newRouteFrom);
    setFormRouteTo(newRouteTo);

    // Reset fields & close modal
    setNewRouteTitle('');
    setNewRouteFrom('');
    setNewRouteTo('');
    setNewRouteDesc('');
    setNewRouteCode('');
    setShowAddRouteModal(false);
  };

  const startEdit = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id);
    setFormId(vehicle.id);
    setFormName(vehicle.name);
    setFormType(vehicle.type);
    setFormPlate(vehicle.licensePlate);
    setFormDeviceId(vehicle.deviceId);
    setFormDriver(vehicle.driverName);
    setFormPhone(vehicle.driverPhone);
    setFormMaxWeight(vehicle.maxCargoWeight);
    setFormColor(vehicle.iconColor);
    setFormRouteFrom(vehicle.routeFrom || '');
    setFormRouteTo(vehicle.routeTo || '');
    setShowForm(true);
  };

  const resetForm = () => {
    setFormId('');
    setFormName('');
    setFormType('Truck');
    setFormPlate('');
    setFormDeviceId('');
    setFormDriver('');
    setFormPhone('');
    setFormMaxWeight(3000);
    setFormColor('#E11D48');
    setFormRouteFrom('');
    setFormRouteTo('');
    setShowForm(false);
  };

  // Find available devices (devices that are either not assigned, or already assigned to THIS vehicle during editing)
  const availableDevices = devices.filter(
    (d) => !d.assignedVehicleId || (editingVehicleId && d.assignedVehicleId === editingVehicleId)
  );

  return (
    <div className="space-y-6">
      {/* Read-Only Status Alert */}
      {userRole === 'viewer' && (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 px-4 py-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold shadow-sm">
          <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0" />
          <span>🔒 {t('vm.readOnlyAlert')}</span>
        </div>
      )}

      {/* 1. HEADER DESCRIPTION */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg h-fit">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-blue-900">{t('vm.headerTitle')}</h4>
            <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
              {t('vm.headerDesc')}
            </p>
          </div>
        </div>
        {userRole !== 'viewer' ? (
          <button
            id="btn-add-vehicle-toggle"
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t('vm.addVehicle')}
          </button>
        ) : (
          <button
            id="btn-add-vehicle-toggle-disabled"
            disabled
            className="flex items-center gap-2 bg-slate-200 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold shrink-0 cursor-not-allowed"
            title={t('common.readOnlyAccess')}
          >
            🔒 {t('common.actionsLocked')}
          </button>
        )}
      </div>

      {/* 2. FORM DRAWER BOX */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4 animate-fade-in">
          <h3 className="font-bold text-sm text-slate-800">
            {editingVehicleId ? `✏️ ${t('vm.editTitle')}` : `🚚 ${t('vm.registerTitle')}`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('vm.vehicleId')} *</label>
              <input
                id="form-vehicle-id"
                type="text"
                required
                disabled={!!editingVehicleId}
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="e.g. V-106"
                className="p-2 border border-slate-200 rounded-lg text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('vm.assetTitle')} *</label>
              <input
                id="form-vehicle-name"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Cargo Sprinter Truck F"
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('vm.licensePlate')} *</label>
              <input
                id="form-vehicle-plate"
                type="text"
                required
                value={formPlate}
                onChange={(e) => setFormPlate(e.target.value)}
                placeholder="e.g. WQX 4521"
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('vm.typeProfile')}</label>
              <select
                id="form-vehicle-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Truck">{t('vm.typeTruck')}</option>
                <option value="Van">{t('vm.typeVan')}</option>
                <option value="Sedan">{t('vm.typeSedan')}</option>
                <option value="SUV">{t('vm.typeSuv')}</option>
                <option value="Motorcycle">{t('vm.typeMotorcycle')}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('vm.driverOperator')} *</label>
              <input
                id="form-vehicle-driver"
                type="text"
                required
                value={formDriver}
                onChange={(e) => setFormDriver(e.target.value)}
                placeholder={t('vm.fullOperatorName')}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('vm.phoneContact')} *</label>
              <input
                id="form-vehicle-phone"
                type="text"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+62 8xx-xxxx-xxxx"
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('vm.maxWeight')}</label>
              <input
                id="form-vehicle-weight"
                type="number"
                min="0"
                value={formMaxWeight}
                onChange={(e) => setFormMaxWeight(Number(e.target.value))}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('vm.pairDevice')}</label>
              <select
                id="form-vehicle-device"
                value={formDeviceId}
                onChange={(e) => setFormDeviceId(e.target.value)}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('vm.doNotPair')}</option>
                {availableDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    📡 {d.name} ({d.id} - IMEI: {d.imei})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 p-3.5 bg-indigo-55/60 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> {t('vm.routeCorridor')}
                </span>
                <button
                  type="button"
                  id="btn-add-route-manual-library"
                  onClick={() => setShowAddRouteModal(true)}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-wider rounded flex items-center gap-1 transition shadow-xs cursor-pointer select-none"
                >
                  <Plus className="w-3 h-3 shrink-0" /> {t('vm.saveRouteLibrary')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="font-semibold text-slate-600">{t('vm.selectLibraryRoute')}</label>
                  <select
                    id="form-vehicle-route-select"
                    value={customRoutes?.find(r => r.from === formRouteFrom && r.to === formRouteTo)?.id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId) {
                        const r = customRoutes?.find(route => route.id === selectedId);
                        if (r) {
                          setFormRouteFrom(r.from);
                          setFormRouteTo(r.to);
                        }
                      }
                    }}
                    className="p-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{t('vm.manualEntry')}</option>
                    {customRoutes?.map((r) => (
                      <option key={r.id} value={r.id}>
                        📍 {r.title} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">{t('vm.routeOrigin')}</label>
                  <input
                    id="form-vehicle-route-from"
                    type="text"
                    value={formRouteFrom}
                    onChange={(e) => setFormRouteFrom(e.target.value)}
                    placeholder="e.g. Tangerang HQ Depot"
                    className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">{t('vm.routeDestination')}</label>
                  <input
                    id="form-vehicle-route-to"
                    type="text"
                    value={formRouteTo}
                    onChange={(e) => setFormRouteTo(e.target.value)}
                    placeholder="e.g. CGK Airport Cargo Terminal"
                    className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Custom Color Selector */}
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="font-semibold text-slate-600">{t('vm.colorProfile')}</label>
              <div className="flex gap-2 items-center h-full pt-1">
                {VEHICLE_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    id={`btn-color-pick-${col.hex.replace('#', '')}`}
                    type="button"
                    onClick={() => setFormColor(col.hex)}
                    className={`w-6 h-6 rounded-full border shadow transition ${
                      formColor === col.hex ? 'ring-2 ring-blue-600 ring-offset-1 scale-110' : 'opacity-80'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  ></button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 text-xs pt-2">
            <button
              id="vehicle-form-cancel"
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
            >
              {t('common.cancel')}
            </button>
            <button
              id="vehicle-form-save"
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
            >
              {editingVehicleId ? t('vm.applyChanges') : t('vm.registerAsset')}
            </button>
          </div>
        </form>
      )}

      {/* 3. ASSET TABLE / CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vehicles.map((v) => {
          const correspondingDevice = devices.find((d) => d.id === v.deviceId);
          const ratio = v.maxCargoWeight > 0 ? (v.cargoWeight / v.maxCargoWeight) * 100 : 0;

          return (
            <div 
              key={v.id} 
              className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow transition-all space-y-4"
            >
              {/* Profile Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shadow" style={{ backgroundColor: v.iconColor }}>
                    <span className="text-xl">
                      {v.type === 'Truck' ? '🚚' : v.type === 'Van' ? '🚐' : v.type === 'Sedan' ? '🚗' : v.type === 'SUV' ? '🚘' : '🏍️'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                      {v.name}
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded font-mono font-bold text-slate-500 uppercase">
                        {v.licensePlate}
                      </span>
                    </h4>
                    <p className="text-[10px] font-semibold text-slate-400 capitalize">{v.type} {t('vm.assetIdLabel')} {v.id}</p>
                  </div>
                </div>

                {userRole !== 'viewer' ? (
                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-edit-vehicle-${v.id}`}
                      onClick={() => startEdit(v)}
                      className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-blue-600 rounded-lg transition cursor-pointer"
                      title={t('vm.configureParams')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-delete-vehicle-${v.id}`}
                      onClick={() => onDeleteVehicle(v.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      title={t('vm.retireAsset')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-lg">
                    🔒 {t('common.locked')}
                  </span>
                )}
              </div>

              {/* Operator details & Device details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">{t('vm.dispatchPilot')}</span>
                  <div className="flex items-center gap-2">
                    <img
                      src={v.avatar}
                      alt={v.driverName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="font-bold text-slate-800 leading-tight">{v.driverName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{v.driverPhone}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">{t('vm.pairedTransceiver')}</span>
                  {correspondingDevice ? (
                    <div className="space-y-0.5">
                      <p className="font-bold text-blue-700 leading-tight truncate">{correspondingDevice.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono font-bold">IMEI: {correspondingDevice.imei}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {t('vm.unpairedHardware')}
                    </p>
                  )}
                </div>
              </div>

              {/* Assigned Route Corridor */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                <span className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider block flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> {t('vm.routeCorridor')}
                </span>
                <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-slate-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">{t('vm.routeOrigin')}</p>
                    <p className="font-extrabold text-slate-700 truncate text-[11px]">{v.routeFrom || 'Tangerang HQ Depot'}</p>
                  </div>
                  <div className="text-slate-350 px-1 font-extrabold text-xs">➡️</div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">{t('vm.routeDestination')}</p>
                    <p className="font-extrabold text-slate-700 truncate text-[11px]">{v.routeTo || 'CGK Airport Cargo Terminal'}</p>
                  </div>
                </div>
              </div>

              {/* Odometer & Engine Runtime Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">{t('vm.odometerDistance')}</span>
                  <span className="font-mono font-bold text-slate-700">{(v.odometer ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[9px] font-bold text-slate-400 font-sans">km</span></span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">{t('vm.engineRuntime')}</span>
                  <span className="font-mono font-bold text-slate-700">{(v.engineHours ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[9px] font-bold text-slate-400 font-sans">hrs</span></span>
                </div>
              </div>

              {/* Integrated Loaded Cargo Weights progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                  <span>{t('vm.loadedWeight')}</span>
                  <span className={ratio >= 90 ? 'text-rose-600 font-extrabold' : 'text-slate-700'}>
                    {v.cargoWeight.toLocaleString()} / {v.maxCargoWeight.toLocaleString()} kg ({ratio.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      ratio >= 95 
                        ? 'bg-rose-600 animate-pulse' 
                        : ratio >= 80 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD MANUALLY ASSIGNED ROUTE MODAL */}
      {showAddRouteModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="modal-add-route-manual">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100 relative">
            <div className="flex gap-3 text-slate-800">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl h-fit shrink-0">
                <Milestone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">{t('vm.addManualRoute')}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{t('vm.addManualRouteDesc')}</p>
              </div>
            </div>

            <form onSubmit={handleSaveRouteToLibrary} className="space-y-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-600">{t('vm.routeTitleLabel')}</label>
                <input
                  id="modal-route-title"
                  type="text"
                  required
                  placeholder="e.g. TNG Depot ➡️ BDO Airport"
                  value={newRouteTitle}
                  onChange={(e) => setNewRouteTitle(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">{t('vm.routeOrigin')}</label>
                  <input
                    id="modal-route-from"
                    type="text"
                    required
                    placeholder="e.g. Tangerang HQ Depot"
                    value={newRouteFrom}
                    onChange={(e) => setNewRouteFrom(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">{t('vm.routeDestination')}</label>
                  <input
                    id="modal-route-to"
                    type="text"
                    required
                    placeholder="e.g. Bandung Airport Hub"
                    value={newRouteTo}
                    onChange={(e) => setNewRouteTo(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">{t('vm.routeCode')}</label>
                  <input
                    id="modal-route-code"
                    type="text"
                    placeholder="e.g. CGK-BDO-EXP"
                    value={newRouteCode}
                    onChange={(e) => setNewRouteCode(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono uppercase"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">{t('vm.waypointsList')}</label>
                  <input
                    id="modal-route-waypoints"
                    type="text"
                    placeholder="e.g. Cikupa, Balaraja, Cilegon"
                    value={newRouteDesc}
                    onChange={(e) => setNewRouteDesc(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  id="modal-route-cancel"
                  onClick={() => setShowAddRouteModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition cursor-pointer select-none"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  id="modal-route-save"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition cursor-pointer select-none"
                >
                  {t('vm.saveApplyRoute')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
