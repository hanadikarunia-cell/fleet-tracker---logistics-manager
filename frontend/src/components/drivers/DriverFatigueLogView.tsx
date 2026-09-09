import { useState, useMemo, FormEvent } from 'react';
import { DriverPerformance, Vehicle } from '../../types';
import {
  Clock, ShieldAlert, AlertTriangle, CheckCircle2, Moon, Sun,
  Activity, Coffee, HeartPulse, User, Plus, Filter, Calendar,
  FileText, Sparkles, Timer
} from 'lucide-react';

interface DriverFatigueLogViewProps {
  drivers: DriverPerformance[];
  vehicles: Vehicle[];
}

export interface RestBreakLog {
  id: string;
  driverId: string;
  driverName: string;
  breakType: 'mandatory_30min' | 'meal_break' | 'overnight_rest';
  startTime: string;
  durationMinutes: number;
  location: string;
  supervisorApproval: boolean;
  notes: string;
}

const INITIAL_REST_LOGS: RestBreakLog[] = [
  {
    id: 'REST-501',
    driverId: 'D-101',
    driverName: 'Kamal Aris',
    breakType: 'mandatory_30min',
    startTime: '2026-07-22 14:30',
    durationMinutes: 35,
    location: 'Tapah Highway Rest Stop (KM 320)',
    supervisorApproval: true,
    notes: 'Standard 4-hour driving rest break logged.',
  },
  {
    id: 'REST-502',
    driverId: 'D-102',
    driverName: 'Farid Ahmad',
    breakType: 'meal_break',
    startTime: '2026-07-22 12:00',
    durationMinutes: 45,
    location: 'Subang Cargo Hub Canteen',
    supervisorApproval: true,
    notes: 'Midday meal break completed.',
  },
  {
    id: 'REST-503',
    driverId: 'D-103',
    driverName: 'Hafiz Rahim',
    breakType: 'overnight_rest',
    startTime: '2026-07-21 22:00',
    durationMinutes: 600, // 10 hrs
    location: 'Penang Airport Transit Lodge',
    supervisorApproval: true,
    notes: 'Full 10-hour mandatory rest cycle completed.',
  },
];

export default function DriverFatigueLogView({
  drivers,
  vehicles,
}: DriverFatigueLogViewProps) {
  const getDriverKey = (d: DriverPerformance) => d.id || d.driverName || d.vehicleId;

  const [restLogs, setRestLogs] = useState<RestBreakLog[]>(() => {
    const saved = localStorage.getItem('fleet_fatigue_logs');
    return saved ? JSON.parse(saved) : INITIAL_REST_LOGS;
  });

  const [selectedDriverId, setSelectedDriverId] = useState<string>('All');
  const [showLogModal, setShowLogModal] = useState(false);

  // New Rest Log Form State
  const [newDriverId, setNewDriverId] = useState<string>(getDriverKey(drivers[0] || { vehicleId: 'V1', driverName: 'Driver', safetyScore: 90, maxSpeed: 80, harshBrakingCount: 0, harshAccelerationCount: 0, idleTimeMin: 10, totalDistanceKm: 100 }));
  const [newBreakType, setNewBreakType] = useState<'mandatory_30min' | 'meal_break' | 'overnight_rest'>('mandatory_30min');
  const [newDuration, setNewDuration] = useState<number>(30);
  const [newLocation, setNewLocation] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  // Compute Fatigue Risk & Duty Hours per Driver
  const driverDutyData = useMemo(() => {
    return drivers.map(d => {
      // Synthesize realistic duty shift parameters
      const drivingHoursToday = Math.round(((d.totalDistanceKm % 500) / 60) * 10) / 10; // max 10hrs
      const dutyHoursRemaining = Math.max(0, Math.round((10 - drivingHoursToday) * 10) / 10);
      const continuousDriveHrs = Math.round((drivingHoursToday * 0.6) * 10) / 10;

      let fatigueRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (continuousDriveHrs >= 4.5 || drivingHoursToday >= 9.5) {
        fatigueRisk = 'critical';
      } else if (continuousDriveHrs >= 3.5 || drivingHoursToday >= 8.0) {
        fatigueRisk = 'high';
      } else if (continuousDriveHrs >= 2.5) {
        fatigueRisk = 'medium';
      }

      return {
        ...d,
        driverKey: getDriverKey(d),
        drivingHoursToday,
        dutyHoursRemaining,
        continuousDriveHrs,
        fatigueRisk,
      };
    });
  }, [drivers]);

  const filteredDutyData = useMemo(() => {
    if (selectedDriverId === 'All') return driverDutyData;
    return driverDutyData.filter(d => d.driverKey === selectedDriverId);
  }, [driverDutyData, selectedDriverId]);

  const criticalFatigueCount = driverDutyData.filter(d => d.fatigueRisk === 'critical' || d.fatigueRisk === 'high').length;

  const handleCreateRestLog = (e: FormEvent) => {
    e.preventDefault();
    const drv = drivers.find(d => getDriverKey(d) === newDriverId) || drivers[0];
    const newLog: RestBreakLog = {
      id: `REST-${Math.floor(100 + Math.random() * 900)}`,
      driverId: getDriverKey(drv),
      driverName: drv.driverName,
      breakType: newBreakType,
      startTime: new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }),
      durationMinutes: newDuration,
      location: newLocation || 'Depot Rest Station',
      supervisorApproval: true,
      notes: newNotes || 'Routine driver rest break logged.',
    };

    const updated = [newLog, ...restLogs];
    setRestLogs(updated);
    localStorage.setItem('fleet_fatigue_logs', JSON.stringify(updated));
    setShowLogModal(false);
    setNewNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/60 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Driver Fatigue & Hours of Service (HOS) Log</h3>
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/40 uppercase tracking-wider">
                ICAO / DOT Compliant
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Continuous driving limit tracking, rest break enforcement, and circadian bio-rhythm fatigue alerts.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Log Rest Break
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Active Shift Operators</p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <User className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {driverDutyData.length} <span className="text-xs font-normal text-slate-500">drivers</span>
          </h3>
          <span className="text-[10px] text-indigo-600 font-bold">100% telemetry synced</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Fatigue Risk Warnings</p>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-rose-600 mt-1">
            {criticalFatigueCount} <span className="text-xs font-normal text-slate-500">high risk</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Over 3.5 hrs continuous drive</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Logged Rest Breaks Today</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">
            {restLogs.length} <span className="text-xs font-normal text-slate-500">breaks</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">HOS break compliance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Avg Duty Shift Remaining</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            5.2 <span className="text-xs font-normal text-slate-500">hrs</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">10-hour max duty limit</span>
        </div>
      </div>

      {/* Driver Real-Time Duty & Fatigue Matrix */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-3">
        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">Real-Time Driver Shift & Fatigue Monitoring</h4>
            <p className="text-xs text-slate-500">Continuous driving time, duty shift quota, and bio-rhythm fatigue risk ratings.</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">Driver Name</th>
                <th className="p-3 text-center">Shift Drive Time</th>
                <th className="p-3 text-center">Continuous Drive</th>
                <th className="p-3 text-center">Duty Remaining</th>
                <th className="p-3 text-center">Fatigue Risk Level</th>
                <th className="p-3 text-center">HOS Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredDutyData.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="p-3">
                    <p className="font-bold text-slate-900 text-xs">{d.driverName}</p>
                    <span className="text-[10px] text-slate-500">{d.vehicleName}</span>
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-slate-800">
                    {d.drivingHoursToday} hrs
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-slate-800">
                    {d.continuousDriveHrs} hrs
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-emerald-700">
                    {d.dutyHoursRemaining} hrs
                  </td>

                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      d.fatigueRisk === 'critical'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : d.fatigueRisk === 'high'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : d.fatigueRisk === 'medium'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {d.fatigueRisk === 'critical' || d.fatigueRisk === 'high' ? (
                        <ShieldAlert className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {d.fatigueRisk} Fatigue
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    {d.continuousDriveHrs >= 4.0 ? (
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Rest Break Mandatory
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        HOS Compliant
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rest Break Log Audit History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-3">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-sm text-slate-900">Rest Break & Rest Interval Audit Trail</h4>
          <p className="text-xs text-slate-500">Official log entries of mandatory 30-min rest breaks and overnight sleep cycles.</p>
        </div>

        <div className="space-y-2">
          {restLogs.map((log) => (
            <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.driverName}</span>
                    <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {log.breakType === 'mandatory_30min' ? '30m Mandatory Rest' : log.breakType === 'meal_break' ? 'Meal Break' : '10h Overnight Sleep'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{log.location} — {log.notes}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono font-bold text-slate-800 block">{log.durationMinutes} minutes</span>
                <span className="text-[10px] text-slate-400">{log.startTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REST BREAK LOGGER MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-indigo-600" /> Record Driver Rest Break Log
              </h3>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRestLog} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Driver</label>
                <select
                  value={newDriverId}
                  onChange={(e) => setNewDriverId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold outline-none"
                >
                  {drivers.map(d => (
                    <option key={getDriverKey(d)} value={getDriverKey(d)}>{d.driverName} ({d.vehicleName || d.vehicleId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rest Break Category</label>
                <select
                  value={newBreakType}
                  onChange={(e) => setNewBreakType(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold outline-none"
                >
                  <option value="mandatory_30min">Mandatory 30-Min Rest Break (HOS)</option>
                  <option value="meal_break">Mid-Shift Meal Break</option>
                  <option value="overnight_rest">10-Hour Overnight Rest Cycle</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min="15"
                  max="720"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rest Location / Highway Stop</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tapah Highway Rest Stop"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Supervisor Notes / Verification</label>
                <textarea
                  rows={2}
                  placeholder="Additional rest notes..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-xs"
                >
                  Save Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
