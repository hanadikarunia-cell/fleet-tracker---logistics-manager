import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Compass, Sliders, Sparkles, Navigation, Fuel, Clock, MapPin,
  AlertTriangle, ShieldCheck, Zap, RefreshCw, ArrowRight, CloudRain, Shield
} from 'lucide-react';

interface SimulatorWaypoint {
  name: string;
  distanceKm: number;
  baselineSpeedKmh: number;
  simulatedSpeedKmh: number;
  baselineFuelLiters: number;
  simulatedFuelLiters: number;
}

export default function SmartRouteSimulator() {
  const [weatherSeverity, setWeatherSeverity] = useState<number>(1.2); // Rain/Storm multiplier
  const [roadworkImpact, setRoadworkImpact] = useState<number>(1.1); // Delay factor
  const [preferTolls, setPreferTolls] = useState<boolean>(true);
  const [evMode, setEvMode] = useState<boolean>(false);

  // Compute waypoint graph data
  const routePoints: SimulatorWaypoint[] = useMemo(() => {
    return [
      {
        name: 'Westport Gate 1',
        distanceKm: 0,
        baselineSpeedKmh: 80,
        simulatedSpeedKmh: Math.round(80 / (weatherSeverity * 0.9)),
        baselineFuelLiters: 0,
        simulatedFuelLiters: 0,
      },
      {
        name: 'Klang Expressway Jct',
        distanceKm: 22,
        baselineSpeedKmh: 45,
        simulatedSpeedKmh: Math.round(75 / (weatherSeverity * 0.95)),
        baselineFuelLiters: 9.2,
        simulatedFuelLiters: preferTolls ? 6.5 : 8.1,
      },
      {
        name: 'Shah Alam Cargo Hub',
        distanceKm: 48,
        baselineSpeedKmh: 50,
        simulatedSpeedKmh: Math.round(70 / roadworkImpact),
        baselineFuelLiters: 18.5,
        simulatedFuelLiters: preferTolls ? 13.8 : 16.2,
      },
      {
        name: 'Sepang KLIA Freight Depot',
        distanceKm: 88,
        baselineSpeedKmh: 78,
        simulatedSpeedKmh: Math.round(85 / (weatherSeverity * 0.9)),
        baselineFuelLiters: 31.0,
        simulatedFuelLiters: preferTolls ? 22.4 : 27.8,
      },
    ];
  }, [weatherSeverity, roadworkImpact, preferTolls]);

  const totalBaselineFuel = routePoints[routePoints.length - 1].baselineFuelLiters;
  const totalSimulatedFuel = routePoints[routePoints.length - 1].simulatedFuelLiters;
  const fuelSavingsPct = Math.round(((totalBaselineFuel - totalSimulatedFuel) / totalBaselineFuel) * 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-teal-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-2xl border border-teal-400/30">
            <Compass className="w-6 h-6 animate-pulse text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">AI Smart Route & Traffic Scenario Simulator</h3>
              <span className="bg-teal-500/30 text-teal-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-teal-400/40 uppercase tracking-wider">
                Monte Carlo Predictive Routing
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Simulate monsoon rain disruptions, roadwork bottlenecks, toll bypasses, and EV charging stop intervals in real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Simulated Savings</span>
            <span className="font-mono text-xs font-extrabold text-emerald-400">-{fuelSavingsPct}% Fuel & CO2</span>
          </div>
        </div>
      </div>

      {/* Simulator Variable Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1"><CloudRain className="w-3.5 h-3.5 text-blue-500" /> Weather Impact:</span>
            <span className="font-mono text-indigo-600">{weatherSeverity.toFixed(1)}x Rain</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="2.0"
            step="0.1"
            value={weatherSeverity}
            onChange={(e) => setWeatherSeverity(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block">Simulates heavy rainfall & road friction reduction</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Roadwork Congestion:</span>
            <span className="font-mono text-amber-600">{roadworkImpact.toFixed(1)}x Delay</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="2.2"
            step="0.1"
            value={roadworkImpact}
            onChange={(e) => setRoadworkImpact(parseFloat(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block">Simulates lane closures & port gate queue friction</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <span className="text-xs font-extrabold text-slate-800 block">Prefer Toll Expressways</span>
            <span className="text-[10px] text-slate-500 block">Bypass city congestion</span>
          </div>
          <button
            type="button"
            onClick={() => setPreferTolls(!preferTolls)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              preferTolls ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {preferTolls ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <span className="text-xs font-extrabold text-slate-800 block">EV Heavy Hauler Mode</span>
            <span className="text-[10px] text-slate-500 block">Simulate charging stops</span>
          </div>
          <button
            type="button"
            onClick={() => setEvMode(!evMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              evMode ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {evMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Simulator Recharts Graph */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Navigation className="w-4 h-4 text-teal-600" /> Speed Profile & Cumulative Fuel Burn Comparison
          </h4>
          <span className="text-xs font-mono font-bold text-slate-500">
            Baseline ({totalBaselineFuel.toFixed(1)} L) vs AI Sim ({totalSimulatedFuel.toFixed(1)} L)
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={routePoints} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Line type="monotone" dataKey="baselineSpeedKmh" name="Baseline Speed (km/h)" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
              <Line type="monotone" dataKey="simulatedSpeedKmh" name="AI Simulated Speed (km/h)" stroke="#0d9488" strokeWidth={3} />
              <Line type="monotone" dataKey="simulatedFuelLiters" name="AI Fuel Burn (Liters)" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
