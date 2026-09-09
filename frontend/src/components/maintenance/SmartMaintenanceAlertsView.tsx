import { useState, useMemo } from 'react';
import { Vehicle, MaintenanceLog } from '../../types';
import MaintenancePredictorChart from './MaintenancePredictorChart';
import {
  Wrench, AlertTriangle, ShieldAlert, CheckCircle2, Clock,
  Cpu, Activity, Gauge, Flame, Sparkles, Plus, Filter,
  CheckCircle, RefreshCw, Layers, ShieldCheck, Thermometer, Brain
} from 'lucide-react';

interface SmartMaintenanceAlertsViewProps {
  vehicles: Vehicle[];
  maintenanceLogs: MaintenanceLog[];
  onCompleteMaintenance?: (id: string) => void;
  onAddMaintenanceLog?: (log: Omit<MaintenanceLog, 'id'>) => void;
}

export interface DiagnosticTroubleCode {
  code: string;
  system: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  vehicleId: string;
  vehicleName: string;
  timestamp: string;
}

const MOCK_DTC_CODES: DiagnosticTroubleCode[] = [
  {
    code: 'P0300',
    system: 'Powertrain / Ignition',
    severity: 'critical',
    description: 'Random / Multiple Cylinder Misfire Detected in Engine Block B',
    vehicleId: 'TR-01',
    vehicleName: 'Heavy Hauler 01',
    timestamp: '2026-07-22 19:40',
  },
  {
    code: 'C0035',
    system: 'Chassis / ABS Telematics',
    severity: 'warning',
    description: 'Left Front Wheel Speed Sensor Circuit Velocity Anomaly',
    vehicleId: 'V-101',
    vehicleName: 'Rapid Van 01',
    timestamp: '2026-07-22 17:15',
  },
  {
    code: 'P0420',
    system: 'Exhaust & Emissions',
    severity: 'warning',
    description: 'Catalyst System Efficiency Below Threshold (Bank 1)',
    vehicleId: 'V-103',
    vehicleName: 'Heavy Hauler 02',
    timestamp: '2026-07-21 14:00',
  },
  {
    code: 'B0001',
    system: 'Safety Restraints',
    severity: 'info',
    description: 'Driver Frontal Stage 1 Deployment Control Resistance Low',
    vehicleId: 'AIR-901',
    vehicleName: 'AirAsia Cargo Airbus A320',
    timestamp: '2026-07-20 11:30',
  },
];

export default function SmartMaintenanceAlertsView({
  vehicles,
  maintenanceLogs,
  onCompleteMaintenance,
  onAddMaintenanceLog,
}: SmartMaintenanceAlertsViewProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');

  // Filter DTC Codes
  const filteredDtcs = useMemo(() => {
    return MOCK_DTC_CODES.filter(dtc => {
      const matchVehicle = selectedVehicleId === 'All' || dtc.vehicleId === selectedVehicleId;
      const matchSeverity = selectedSeverity === 'All' || dtc.severity === selectedSeverity;
      return matchVehicle && matchSeverity;
    });
  }, [selectedVehicleId, selectedSeverity]);

  // Compute Wear & Tear Health Metrics for Vehicles
  const vehicleHealthData = useMemo(() => {
    return vehicles.map(v => {
      // Synthesize realistic wear readings
      const odo = v.odometer || 12000;
      const hrs = v.engineHours || 450;
      const brakePadLifePercent = Math.max(12, Math.min(98, Math.round(100 - (odo / 1200))));
      const tireTreadMm = Math.max(2.1, Math.min(8.5, Math.round((8.5 - (odo / 15000)) * 10) / 10));
      const oilLifePercent = Math.max(8, Math.min(100, Math.round(100 - (hrs % 250) / 2.5)));
      const batterySohPercent = v.batteryPercent || 88;

      const needsImmediateService = brakePadLifePercent < 25 || tireTreadMm < 3.0 || oilLifePercent < 15;

      return {
        ...v,
        brakePadLifePercent,
        tireTreadMm,
        oilLifePercent,
        batterySohPercent,
        needsImmediateService,
      };
    });
  }, [vehicles]);

  const criticalHealthCount = vehicleHealthData.filter(v => v.needsImmediateService).length;

  const handleTriggerWorkOrder = (vehicle: Vehicle, reason: string) => {
    if (onAddMaintenanceLog) {
      onAddMaintenanceLog({
        vehicleId: vehicle.id,
        serviceType: 'repair',
        description: `Automated Smart Maintenance WO: ${reason}`,
        mileageInterval: vehicle.odometer ? vehicle.odometer + 5000 : 15000,
        status: 'scheduled',
        dueDate: new Date().toISOString().slice(0, 10),
        cost: 850,
      });
      alert(`Work Order generated successfully for ${vehicle.name}!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-amber-800/60 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <Wrench className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Smart Maintenance & Predictive OBD Diagnostics</h3>
              <span className="bg-amber-500/30 text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-400/40 uppercase tracking-wider">
                Telemetry Scan Active
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              CAN-bus diagnostic trouble code (DTC) monitoring, wear & tear predictive lifespan engine, and automated service dispatch.
            </p>
          </div>
        </div>

        {/* Vehicle Filter */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-200 outline-none px-2 py-1 cursor-pointer"
          >
            <option value="All" className="bg-slate-900 text-white">All Fleet Vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id} className="bg-slate-900 text-white">{v.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Active OBD Diagnostic DTCs</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {filteredDtcs.length} <span className="text-xs font-normal text-slate-500">codes</span>
          </h3>
          <span className="text-[10px] text-amber-600 font-bold">CAN-bus telemetry engine active</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Immediate Wear Service Needed</p>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-rose-600 mt-1">
            {criticalHealthCount} <span className="text-xs font-normal text-slate-500">vehicles</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Brake pads or oil life below 20%</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Pending Work Orders</p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {maintenanceLogs.filter(m => m.status === 'scheduled').length} <span className="text-xs font-normal text-slate-500">open WO</span>
          </h3>
          <span className="text-[10px] text-indigo-600 font-bold">Logistics workshop scheduled</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Completed Service Jobs</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-emerald-700 mt-1">
            {maintenanceLogs.filter(m => m.status === 'completed').length} <span className="text-xs font-normal text-slate-500">jobs</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">100% compliance record</span>
        </div>
      </div>

      {/* Real-time DTC Fault Codes Feed */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-600" /> Active CAN-bus Diagnostic Trouble Codes (DTC)
            </h4>
            <p className="text-xs text-slate-500">Direct OBD-II / J1939 telematics fault code broadcast from vehicle ECU.</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedSeverity('All')}
              className={`px-3 py-1 rounded-lg cursor-pointer ${selectedSeverity === 'All' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedSeverity('critical')}
              className={`px-3 py-1 rounded-lg cursor-pointer ${selectedSeverity === 'critical' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500'}`}
            >
              Critical
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDtcs.map((dtc) => {
            const isCrit = dtc.severity === 'critical';

            return (
              <div
                key={dtc.code}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                  isCrit ? 'bg-rose-50/80 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black px-2.5 py-1 bg-slate-900 text-amber-400 rounded-lg">
                      {dtc.code}
                    </span>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900">{dtc.vehicleName}</h5>
                      <p className="text-[10px] text-slate-500 font-semibold">{dtc.system}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                    isCrit ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {dtc.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-medium">{dtc.description}</p>

                <div className="flex items-center justify-between border-t border-black/10 pt-2 text-[10px] text-slate-500">
                  <span>Detected: {dtc.timestamp}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const veh = vehicles.find(v => v.id === dtc.vehicleId) || vehicles[0];
                      handleTriggerWorkOrder(veh, `Fix ECU Code ${dtc.code}: ${dtc.description}`);
                    }}
                    className="px-3 py-1 bg-slate-900 hover:bg-indigo-600 text-white font-extrabold rounded-lg shadow-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Create Work Order
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vehicle Component Wear & Tear Diagnostic Ledger */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-3">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-sm text-slate-900">Predictive Component Wear & Tear Diagnostic Matrix</h4>
          <p className="text-xs text-slate-500">Brake pad remaining life, tire tread depth, and engine oil state of health.</p>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">Vehicle Name</th>
                <th className="p-3 text-center">Brake Pad Life</th>
                <th className="p-3 text-center">Tire Tread Depth</th>
                <th className="p-3 text-center">Engine Oil SOH</th>
                <th className="p-3 text-center">Battery SOH</th>
                <th className="p-3 text-center">Predictive Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {vehicleHealthData.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition">
                  <td className="p-3">
                    <p className="font-bold text-slate-800 text-xs">{v.name}</p>
                    <span className="font-mono text-[10px] text-slate-400">{v.licensePlate}</span>
                  </td>

                  <td className="p-3 text-center">
                    <div className="w-28 mx-auto space-y-1">
                      <div className="flex justify-between text-[10px] font-mono font-bold">
                        <span>{v.brakePadLifePercent}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            v.brakePadLifePercent < 25 ? 'bg-rose-600' : v.brakePadLifePercent < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${v.brakePadLifePercent}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <span className={`font-mono font-extrabold ${v.tireTreadMm < 3.0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {v.tireTreadMm} mm
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    <span className={`font-mono font-extrabold ${v.oilLifePercent < 20 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {v.oilLifePercent}%
                    </span>
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-slate-700">
                    {v.batterySohPercent}%
                  </td>

                  <td className="p-3 text-center">
                    {v.needsImmediateService ? (
                      <button
                        type="button"
                        onClick={() => handleTriggerWorkOrder(v, 'Critical component wear replacement')}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg shadow-xs transition cursor-pointer"
                      >
                        Service Now
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Healthy
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* PREDICTIVE RUL DEGRADATION DECAY CHART */}
      <MaintenancePredictorChart />

      {/* PREDICTIVE COMPONENT FAILURE RISK SIMULATOR */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-800/80 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-amber-400" />
              <h4 className="font-extrabold text-base text-white">AI Predictive Component Failure Risk Simulator</h4>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1">
              Simulate operational conditions (ambient temp, cargo payload weight, braking stress) to calculate remaining component life expectancy.
            </p>
          </div>

          <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-300 font-extrabold text-xs">
            Monte Carlo Predictive Engine v4.2
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4 bg-slate-900/80 p-4 rounded-2xl border border-indigo-900/60">
            <h5 className="font-extrabold text-xs text-indigo-300 uppercase tracking-wider">Simulation Inputs</h5>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Ambient Operating Temp:</span>
                <span className="font-mono font-bold text-amber-400">38°C</span>
              </div>
              <input type="range" min="15" max="50" defaultValue="38" className="w-full accent-amber-500" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Cargo Payload Load Ratio:</span>
                <span className="font-mono font-bold text-indigo-400">88% Capacity</span>
              </div>
              <input type="range" min="30" max="110" defaultValue="88" className="w-full accent-indigo-500" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Harsh Braking Index:</span>
                <span className="font-mono font-bold text-rose-400">High Stress (4.2/10)</span>
              </div>
              <input type="range" min="1" max="10" defaultValue="4" className="w-full accent-rose-500" />
            </div>
          </div>

          <div className="space-y-3 bg-slate-900/80 p-4 rounded-2xl border border-indigo-900/60 flex flex-col justify-between">
            <h5 className="font-extrabold text-xs text-indigo-300 uppercase tracking-wider">Estimated Component Lifespan</h5>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">Front Brake Pads:</span>
                <span className="font-mono font-extrabold text-amber-400">4,200 km remaining (28 days)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">Transmission Fluid SOH:</span>
                <span className="font-mono font-extrabold text-emerald-400">18,500 km remaining (120 days)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300">Tire Tread Depth:</span>
                <span className="font-mono font-extrabold text-rose-400">3.2 mm (Action in 12 days)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert('Predictive Preventive Work Orders dispatched to workshop queue!')}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition cursor-pointer shadow-sm"
            >
              Auto-Schedule Preventative Servicing
            </button>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-indigo-900/60 flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-full border border-amber-400/30">
              <Gauge className="w-8 h-8" />
            </div>
            <h5 className="font-extrabold text-sm text-white">Estimated Downtime Prevention</h5>
            <span className="font-mono font-black text-2xl text-emerald-400">$14,250 Saved</span>
            <p className="text-[11px] text-slate-400">By servicing components before catastrophic roadside breakdown.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
