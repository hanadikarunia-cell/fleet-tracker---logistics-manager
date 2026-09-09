import { useState } from 'react';
import {
  ShieldAlert, Clock, AlertTriangle, CheckCircle2, DollarSign,
  Fuel, Truck, ArrowRight, Zap, RefreshCw, Send, Radio, UserCheck, XCircle
} from 'lucide-react';
import { Vehicle, Geofence } from '../../types';

interface DwellViolation {
  id: string;
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  driverName: string;
  geofenceName: string;
  dwellMinutes: number;
  maxAllowedMinutes: number;
  type: 'excessive_dwell' | 'off_hours_breach' | 'tardy_arrival';
  demurrageCost: number; // $ cost penalty
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: string;
}

const INITIAL_VIOLATIONS: DwellViolation[] = [
  {
    id: 'viol_201',
    vehicleId: 'V-102',
    vehicleName: 'Hauler Heavy #204',
    licensePlate: 'WVN 8821',
    driverName: 'Ahmad Rizwan',
    geofenceName: 'Westport Container Terminal Gate 1',
    dwellMinutes: 52,
    maxAllowedMinutes: 30,
    type: 'excessive_dwell',
    demurrageCost: 85.00,
    status: 'active',
    timestamp: '10:15 AM Today'
  },
  {
    id: 'viol_202',
    vehicleId: 'V-105',
    vehicleName: 'Cold Chain Reefer #305',
    licensePlate: 'VBA 4022',
    driverName: 'Siti Aminah',
    geofenceName: 'Shah Alam Cargo Distribution Center',
    dwellMinutes: 44,
    maxAllowedMinutes: 25,
    type: 'off_hours_breach',
    demurrageCost: 120.00,
    status: 'active',
    timestamp: '09:40 AM Today'
  },
  {
    id: 'viol_203',
    vehicleId: 'V-108',
    vehicleName: 'Express Parcel Van #108',
    licensePlate: 'BKP 9011',
    driverName: 'Ravi Kumar',
    geofenceName: 'Sepang KLIA Cargo Depot',
    dwellMinutes: 38,
    maxAllowedMinutes: 20,
    type: 'tardy_arrival',
    demurrageCost: 45.00,
    status: 'acknowledged',
    timestamp: '08:50 AM Today'
  }
];

interface GeofenceEfficiencyAlertProps {
  vehicles?: Vehicle[];
  geofences?: Geofence[];
  onAddAlert?: (alert: any) => void;
}

export default function GeofenceEfficiencyAlertView({
  vehicles = [],
  geofences = [],
  onAddAlert
}: GeofenceEfficiencyAlertProps) {
  const [violations, setViolations] = useState<DwellViolation[]>(INITIAL_VIOLATIONS);
  const [filterType, setFilterType] = useState<'all' | 'active' | 'resolved'>('all');

  const filteredViolations = violations.filter(v => {
    if (filterType === 'all') return true;
    return v.status === filterType;
  });

  const totalDemurrage = violations
    .filter(v => v.status === 'active')
    .reduce((sum, v) => sum + v.demurrageCost, 0);

  const handleResolve = (id: string) => {
    setViolations(violations.map(v => v.id === id ? { ...v, status: 'resolved' } : v));
  };

  const handleAcknowledge = (id: string) => {
    setViolations(violations.map(v => v.id === id ? { ...v, status: 'acknowledged' } : v));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-rose-950 text-white p-6 rounded-3xl border border-amber-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-400/30">
            <ShieldAlert className="w-6 h-6 animate-pulse text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Geofence Dwell Time & Route Efficiency Monitor</h3>
              <span className="bg-amber-500/30 text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-400/40 uppercase tracking-wider">
                Demurrage Risk Control
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Audits excessive idle times inside port gates, tardy arrivals, and unauthorized curfew breaches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 bg-slate-900 p-3 rounded-2xl border border-slate-800">
          <DollarSign className="w-5 h-5 text-amber-400" />
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Active Demurrage Penalty Risk</span>
            <span className="font-mono text-sm font-black text-rose-400">${totalDemurrage.toFixed(2)} / Today</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter Status:</span>
          {(['all', 'active', 'resolved'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase transition cursor-pointer ${
                filterType === type
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {type === 'all' ? 'All Incidents' : type === 'active' ? 'Active Breaches' : 'Resolved'}
            </button>
          ))}
        </div>

        <span className="text-xs font-bold text-slate-500">
          {filteredViolations.length} Tracked Efficiency Incidents
        </span>
      </div>

      {/* Incident List Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredViolations.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:border-amber-300 transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  item.type === 'excessive_dwell' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  item.type === 'off_hours_breach' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                  'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}>
                  {item.type.replace(/_/g, ' ')}
                </span>
                <h5 className="font-extrabold text-sm text-slate-900">{item.vehicleName} ({item.licensePlate})</h5>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  item.status === 'active' ? 'bg-rose-600 text-white animate-pulse' :
                  item.status === 'acknowledged' ? 'bg-amber-500 text-white' :
                  'bg-emerald-600 text-white'
                }`}>
                  {item.status}
                </span>
                <span className="font-mono text-xs text-slate-400 font-bold">{item.timestamp}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Geofence Zone</span>
                <span className="font-extrabold text-slate-800 block">{item.geofenceName}</span>
                <span className="text-[11px] text-slate-500 block">Driver: {item.driverName}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Dwell Time / Threshold</span>
                <span className="font-mono font-black text-rose-600 text-sm block">
                  {item.dwellMinutes} mins <span className="text-xs text-slate-400 font-normal">(Max: {item.maxAllowedMinutes}m)</span>
                </span>
                <span className="text-[10px] text-amber-600 font-bold">Exceeded by +{item.dwellMinutes - item.maxAllowedMinutes} mins</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Accrued Demurrage Cost</span>
                <span className="font-mono font-black text-slate-900 text-sm block">${item.demurrageCost.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500">Container detention & idle fuel burn</span>
              </div>
            </div>

            {/* Quick Resolution Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => alert(`Pinged driver ${item.driverName} via voice dispatch terminal.`)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5 text-indigo-600" /> Ping Driver Voice
              </button>

              <div className="flex items-center gap-2">
                {item.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(item.id)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    Acknowledge
                  </button>
                )}

                {item.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => handleResolve(item.id)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolve & Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
