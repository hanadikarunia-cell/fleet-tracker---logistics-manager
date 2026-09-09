import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  Activity, Gauge, Fuel, Battery, Play, Pause, RotateCcw,
  Clock, Calendar, Download, AlertTriangle, ShieldCheck, Truck,
  Sliders, ArrowUpRight, Zap, RefreshCw, Layers, MapPin, CheckCircle2
} from 'lucide-react';
import { Vehicle } from '../../types';

interface VehicleTelemetryHistoryProps {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  onSelectVehicleId?: (id: string) => void;
}

interface TelemetryPoint {
  time: string;
  speed: number;
  fuel: number;
  battery: number;
  engineTemp: number;
  rpm: number;
  event?: string;
  severity?: 'info' | 'warning' | 'critical';
}

const GENERATE_SAMPLE_POINTS = (vehicleName: string): TelemetryPoint[] => {
  const times = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'
  ];

  let baseFuel = 95;
  let baseBattery = 98;

  return times.map((t, i) => {
    const isMoving = i % 4 !== 0;
    const speed = isMoving ? Math.floor(Math.random() * 35) + 55 : 0;
    baseFuel = Math.max(15, baseFuel - (isMoving ? 3.5 : 0.8));
    baseBattery = Math.max(20, baseBattery - (isMoving ? 2.5 : 0.5));
    const engineTemp = Math.floor(Math.random() * 15) + 82;
    const rpm = isMoving ? Math.floor(Math.random() * 800) + 1800 : 750;

    let event: string | undefined;
    let severity: 'info' | 'warning' | 'critical' | undefined;

    if (i === 3) {
      event = 'Harsh Braking Detected (0.42g decel)';
      severity = 'warning';
    } else if (i === 7) {
      event = 'TPMS Low Pressure Alert Rear-Right (28 PSI)';
      severity = 'critical';
    } else if (i === 11) {
      event = 'Geofence Entry: CGK Cargo Gate 2';
      severity = 'info';
    } else if (i === 14) {
      event = 'Excessive Idling (>15 mins at Tanjung Priok)';
      severity = 'warning';
    }

    return {
      time: t,
      speed,
      fuel: Math.round(baseFuel * 10) / 10,
      battery: Math.round(baseBattery * 10) / 10,
      engineTemp,
      rpm,
      event,
      severity
    };
  });
};

export default function VehicleTelemetryHistoryView({
  vehicles,
  selectedVehicleId,
  onSelectVehicleId
}: VehicleTelemetryHistoryProps) {
  const [currentVehicleId, setCurrentVehicleId] = useState<string>(
    selectedVehicleId || vehicles[0]?.id || 'V-101'
  );
  const [timeRange, setTimeRange] = useState<'today' | '24h' | '7d'>('today');
  const [metricFocus, setMetricFocus] = useState<'speed' | 'fuel' | 'temp'>('speed');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);

  const activeVehicle = useMemo(() => {
    return vehicles.find(v => v.id === currentVehicleId) || vehicles[0];
  }, [vehicles, currentVehicleId]);

  const telemetryData = useMemo(() => {
    return GENERATE_SAMPLE_POINTS(activeVehicle?.name || 'Vehicle');
  }, [activeVehicle]);

  // Handle Playback Simulation
  const currentPoint = telemetryData[playbackIndex] || telemetryData[0];

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    let idx = playbackIndex;
    const interval = setInterval(() => {
      idx = (idx + 1) % telemetryData.length;
      setPlaybackIndex(idx);
      if (idx === telemetryData.length - 1) {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 1000);
  };

  const maxSpeed = useMemo(() => Math.max(...telemetryData.map(p => p.speed)), [telemetryData]);
  const avgSpeed = useMemo(() => Math.round(telemetryData.reduce((a, b) => a + b.speed, 0) / telemetryData.length), [telemetryData]);
  const totalEvents = useMemo(() => telemetryData.filter(p => p.event).length, [telemetryData]);

  const handleExportCsv = () => {
    const headers = ['Time', 'Speed_kmh', 'Fuel_Percent', 'Battery_Percent', 'Engine_Temp_C', 'Engine_RPM', 'CAN_Event'];
    const rows = telemetryData.map(p => [
      `"${p.time}"`,
      p.speed,
      p.fuel,
      p.battery,
      p.engineTemp,
      p.rpm,
      `"${p.event || 'Normal'}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `telemetry_history_${activeVehicle?.licensePlate || 'vehicle'}_${timeRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-400/30">
            <Activity className="w-6 h-6 animate-pulse text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Vehicle CAN-Bus Telemetry & Route History Log</h3>
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/40 uppercase tracking-wider">
                High-Frequency Telematics
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Inspect speed curves, fuel burn rates, TPMS pressure drops, and CAN-bus diagnostic alarms over time.
            </p>
          </div>
        </div>

        {/* Vehicle Selector */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
          <Truck className="w-4 h-4 text-indigo-400" />
          <select
            value={currentVehicleId}
            onChange={(e) => {
              setCurrentVehicleId(e.target.value);
              if (onSelectVehicleId) onSelectVehicleId(e.target.value);
            }}
            className="bg-transparent text-xs font-extrabold text-white outline-none cursor-pointer"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                {v.name} ({v.licensePlate}) - {v.driverName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Control Bar & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Period:
          </span>
          {(['today', '24h', '7d'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase transition cursor-pointer ${
                timeRange === r
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {r === 'today' ? 'Today' : r === '24h' ? 'Last 24 Hours' : 'Past 7 Days'}
            </button>
          ))}
        </div>

        {/* Metric Selector */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMetricFocus('speed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              metricFocus === 'speed' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-indigo-400" /> Speed Profile
          </button>
          <button
            type="button"
            onClick={() => setMetricFocus('fuel')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              metricFocus === 'fuel' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Fuel className="w-3.5 h-3.5" /> Fuel & Battery
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export Log
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Max Speed Recorded</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-black text-slate-900">{maxSpeed}</span>
            <span className="text-xs font-bold text-slate-500">km/h</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold block">Avg: {avgSpeed} km/h</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fuel Level / Battery</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-black text-amber-600">{activeVehicle?.fuelLevel}%</span>
            <span className="text-xs font-bold text-slate-500">Fuel</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-bold block">Battery SOC: {activeVehicle?.batteryPercent}%</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Engine Diagnostic Temp</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-black text-slate-900">{currentPoint.engineTemp}°C</span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold block">RPM: {currentPoint.rpm}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CAN Diagnostic Alerts</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-black text-rose-600">{totalEvents}</span>
            <span className="text-xs font-bold text-slate-500">Events</span>
          </div>
          <span className="text-[10px] text-amber-600 font-bold block">TPMS & Idling Flagged</span>
        </div>
      </div>

      {/* Interactive Timeline Playback Bar */}
      <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlayToggle}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition cursor-pointer shadow-lg flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <div>
              <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider block">Timeline Playback Simulator</span>
              <span className="font-mono text-sm font-black text-white">Timestamp: {currentPoint.time}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Simulated Telemetry Point</span>
            <span className="font-mono text-xs font-extrabold text-amber-400">
              {currentPoint.speed} km/h • {currentPoint.fuel}% Fuel • {currentPoint.engineTemp}°C
            </span>
          </div>
        </div>

        {/* Playback Scrubber Slider */}
        <input
          type="range"
          min="0"
          max={telemetryData.length - 1}
          value={playbackIndex}
          onChange={(e) => setPlaybackIndex(parseInt(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer"
        />
      </div>

      {/* Recharts Telemetry Graph */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" /> Real-time Telemetry Waveform Comparison
          </h4>
          <span className="text-xs text-slate-500 font-medium">{activeVehicle?.name} ({activeVehicle?.licensePlate})</span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={telemetryData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="speed" name="Speed (km/h)" stroke="#6366f1" fillOpacity={1} fill="url(#speedGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="fuel" name="Fuel Level (%)" stroke="#f59e0b" fillOpacity={1} fill="url(#fuelGrad)" strokeWidth={2} />
              <Line type="monotone" dataKey="engineTemp" name="Engine Temp (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Telemetry Event Audit Stream */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Flagged CAN-Bus Telemetry Events
          </h4>
          <span className="text-xs text-slate-500 font-medium">Logged Diagnostic Events</span>
        </div>

        <div className="divide-y divide-slate-100">
          {telemetryData.filter(p => p.event).map((item, idx) => (
            <div key={idx} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-xl text-white font-black text-xs shrink-0 ${
                  item.severity === 'critical' ? 'bg-rose-600' :
                  item.severity === 'warning' ? 'bg-amber-500' : 'bg-indigo-600'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-mono text-[10px] text-slate-400 font-bold block">{item.time}</span>
                  <span className="font-extrabold text-xs text-slate-900">{item.event}</span>
                </div>
              </div>

              <div className="text-right font-mono text-xs">
                <span className="font-bold text-slate-700 block">{item.speed} km/h</span>
                <span className="text-[10px] text-slate-400">{item.fuel}% Fuel</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
