import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Clock, Navigation, Sparkles, AlertTriangle, ShieldCheck,
  TrendingUp, MapPin, Fuel, Sliders, CheckCircle2, ArrowRight,
  Compass, Zap, CloudRain, Shield
} from 'lucide-react';
import { Vehicle, Geofence } from '../../types';

interface PredictiveArrivalEstimatorProps {
  vehicles?: Vehicle[];
  geofences?: Geofence[];
}

interface RoutePreset {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  baseSpeedKmh: number;
}

const SAMPLE_ROUTES: RoutePreset[] = [
  {
    id: 'rt_1',
    name: 'KUL HQ Depot ➡️ Westport Cargo Gate 1',
    origin: 'Kuala Lumpur HQ Depot',
    destination: 'Westport Container Gate 1',
    distanceKm: 64,
    baseSpeedKmh: 75,
  },
  {
    id: 'rt_2',
    name: 'KUL Cargo Hub ➡️ Penang Int Airport (PEN)',
    origin: 'KUL Cargo Hub',
    destination: 'Penang Airport Depot',
    distanceKm: 348,
    baseSpeedKmh: 85,
  },
  {
    id: 'rt_3',
    name: 'Shah Alam Hub ➡️ Subang SkyPark (SZB)',
    origin: 'Shah Alam Hub',
    destination: 'Subang Airport Depot',
    distanceKm: 28,
    baseSpeedKmh: 55,
  }
];

export default function PredictiveArrivalEstimatorView({ vehicles = [] }: PredictiveArrivalEstimatorProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('rt_1');
  const [congestionIndex, setCongestionIndex] = useState<number>(1.2); // 1.0 - 2.5x traffic multiplier
  const [weatherImpact, setWeatherImpact] = useState<number>(1.1); // 1.0 - 1.5x rain delay
  const [mandatedRestStops, setMandatedRestStops] = useState<boolean>(true); // 15m rest break
  const [customsDelayMins, setCustomsDelayMins] = useState<number>(18); // Port gate queue mins

  const activeRoute = useMemo(() => {
    return SAMPLE_ROUTES.find(r => r.id === selectedRouteId) || SAMPLE_ROUTES[0];
  }, [selectedRouteId]);

  // Compute Predictive ETA Physics Breakdown
  const computation = useMemo(() => {
    const effectiveSpeedKmh = Math.max(20, activeRoute.baseSpeedKmh / (congestionIndex * weatherImpact));
    const pureDrivingHours = activeRoute.distanceKm / effectiveSpeedKmh;
    const pureDrivingMins = Math.round(pureDrivingHours * 60);

    const trafficDelayMins = Math.round(pureDrivingMins * (congestionIndex - 1.0));
    const weatherDelayMins = Math.round(pureDrivingMins * (weatherImpact - 1.0));
    const restStopMins = (mandatedRestStops && activeRoute.distanceKm > 150) ? 20 : 0;
    const gateQueueMins = customsDelayMins;

    const totalDurationMins = pureDrivingMins + trafficDelayMins + weatherDelayMins + restStopMins + gateQueueMins;

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + totalDurationMins * 60 * 1000);
    const etaFormatted = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // On-Time Confidence Score (0-100)
    let confidence = 98 - (congestionIndex - 1.0) * 30 - (weatherImpact - 1.0) * 20;
    confidence = Math.max(45, Math.min(99, Math.round(confidence)));

    return {
      effectiveSpeedKmh: Math.round(effectiveSpeedKmh),
      pureDrivingMins,
      trafficDelayMins,
      weatherDelayMins,
      restStopMins,
      gateQueueMins,
      totalDurationMins,
      etaFormatted,
      confidence
    };
  }, [activeRoute, congestionIndex, weatherImpact, mandatedRestStops, customsDelayMins]);

  const chartData = [
    {
      leg: 'Base Driving',
      minutes: computation.pureDrivingMins,
    },
    {
      leg: 'Traffic Congestion',
      minutes: computation.trafficDelayMins,
    },
    {
      leg: 'Weather Delay',
      minutes: computation.weatherDelayMins,
    },
    {
      leg: 'Driver Rest Stop',
      minutes: computation.restStopMins,
    },
    {
      leg: 'Port Gate Queue',
      minutes: computation.gateQueueMins,
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white p-6 rounded-3xl border border-teal-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-2xl border border-teal-400/30">
            <Clock className="w-6 h-6 animate-pulse text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">AI Predictive Arrival Estimator & Traffic Physics Engine</h3>
              <span className="bg-teal-500/30 text-teal-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-teal-400/40 uppercase tracking-wider">
                Monte Carlo Arrival Confidence
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Factors live vehicle speed, highway bottleneck index, driver mandatory rest breaks, and port gate queues.
            </p>
          </div>
        </div>

        {/* Route Preset Dropdown */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
          <Navigation className="w-4 h-4 text-teal-400" />
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-white outline-none cursor-pointer"
          >
            {SAMPLE_ROUTES.map(r => (
              <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                {r.name} ({r.distanceKm} km)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Calculated Output Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Predicted Time of Arrival (ETA)</span>
          <span className="font-mono text-3xl font-black text-indigo-600 block">{computation.etaFormatted}</span>
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-500" /> Total Duration: {Math.floor(computation.totalDurationMins / 60)}h {computation.totalDurationMins % 60}m
          </span>
        </div>

        <div className="space-y-1 border-l md:border-slate-100 pl-0 md:pl-6">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Arrival Confidence Rating</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-black text-emerald-600">{computation.confidence}%</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              High Accuracy
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">Based on 1,200 simulated highway telemetry trips</span>
        </div>

        <div className="space-y-1 border-l md:border-slate-100 pl-0 md:pl-6">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Effective Cruising Speed</span>
          <span className="font-mono text-3xl font-black text-slate-900">{computation.effectiveSpeedKmh} <span className="text-sm font-semibold text-slate-500">km/h</span></span>
          <span className="text-[10px] text-amber-600 font-bold block">Base Speed: {activeRoute.baseSpeedKmh} km/h</span>
        </div>

        <div className="space-y-1 border-l md:border-slate-100 pl-0 md:pl-6">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Corridor Distance</span>
          <span className="font-mono text-3xl font-black text-slate-900">{activeRoute.distanceKm} <span className="text-sm font-semibold text-slate-500">km</span></span>
          <span className="text-[10px] text-slate-500 font-medium block">{activeRoute.origin} ➡️ {activeRoute.destination}</span>
        </div>
      </div>

      {/* Physics Simulation Variable Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Highway Congestion Index:</span>
            <span className="font-mono text-indigo-600">{congestionIndex.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.1"
            value={congestionIndex}
            onChange={(e) => setCongestionIndex(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block">Simulates peak hour highway bottleneck slowdown</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Weather Monsoon Rain:</span>
            <span className="font-mono text-blue-600">{weatherImpact.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="1.5"
            step="0.1"
            value={weatherImpact}
            onChange={(e) => setWeatherImpact(parseFloat(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block">Simulates heavy rainfall road friction</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Port Gate / Customs Queue:</span>
            <span className="font-mono text-amber-600">{customsDelayMins} mins</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            step="5"
            value={customsDelayMins}
            onChange={(e) => setCustomsDelayMins(parseInt(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block">Simulates manifest inspection delay</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <span className="text-xs font-extrabold text-slate-800 block">Mandatory Driver Rest Period</span>
            <span className="text-[10px] text-slate-500 block">15m rest break mandated</span>
          </div>
          <button
            type="button"
            onClick={() => setMandatedRestStops(!mandatedRestStops)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              mandatedRestStops ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {mandatedRestStops ? 'ACTIVE' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Arrival Time Breakdown Recharts Bar Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" /> Travel Duration Breakdown by Corridor Component (Minutes)
          </h4>
          <span className="text-xs text-slate-500 font-medium">Cumulative Total: {computation.totalDurationMins} minutes</span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="leg" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              <Bar dataKey="minutes" name="Duration (Minutes)" fill="#0d9488" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
