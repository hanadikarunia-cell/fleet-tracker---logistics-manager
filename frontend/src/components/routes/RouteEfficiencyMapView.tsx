import { useState } from 'react';
import {
  Navigation, MapPin, Fuel, ShieldAlert, Sparkles, Clock,
  ArrowRight, CheckCircle2, AlertTriangle, Zap, Compass, RefreshCcw, Eye
} from 'lucide-react';

interface WaypointDetail {
  id: string;
  name: string;
  distanceFromOriginKm: number;
  trafficStatus: 'Clear' | 'Moderate' | 'Heavy Congestion';
  fuelBurnLitersPer100Km: number;
  estSpeedKmh: number;
  co2GramsPerKm: number;
}

const SAMPLE_ROUTE_WAYPOINTS: WaypointDetail[] = [
  { id: 'wp1', name: 'Tanjung Priok Container Terminal', distanceFromOriginKm: 0, trafficStatus: 'Clear', fuelBurnLitersPer100Km: 28.5, estSpeedKmh: 75, co2GramsPerKm: 760 },
  { id: 'wp2', name: 'Federal Highway Interchange B-12', distanceFromOriginKm: 24, trafficStatus: 'Heavy Congestion', fuelBurnLitersPer100Km: 42.1, estSpeedKmh: 22, co2GramsPerKm: 1120 },
  { id: 'wp3', name: 'Cikupa Cargo Hub Gate 4', distanceFromOriginKm: 48, trafficStatus: 'Moderate', fuelBurnLitersPer100Km: 33.0, estSpeedKmh: 58, co2GramsPerKm: 880 },
  { id: 'wp4', name: 'CGK Cargo Terminal 1 (Cengkareng)', distanceFromOriginKm: 86, trafficStatus: 'Clear', fuelBurnLitersPer100Km: 27.2, estSpeedKmh: 82, co2GramsPerKm: 720 },
];

export default function RouteEfficiencyMapView() {
  const [waypoints, setWaypoints] = useState<WaypointDetail[]>(SAMPLE_ROUTE_WAYPOINTS);
  const [detourApplied, setDetourApplied] = useState(false);

  const applyAiDetour = () => {
    // Reroute Federal Highway B-12 to Bypass Expressway E6
    const optimized = waypoints.map((wp) => {
      if (wp.id === 'wp2') {
        return {
          ...wp,
          name: 'North-South Bypass Expressway E6 (AI Detour)',
          trafficStatus: 'Clear' as const,
          fuelBurnLitersPer100Km: 29.0,
          estSpeedKmh: 80,
          co2GramsPerKm: 770,
        };
      }
      return wp;
    });
    setWaypoints(optimized);
    setDetourApplied(true);
  };

  const resetRoute = () => {
    setWaypoints(SAMPLE_ROUTE_WAYPOINTS);
    setDetourApplied(false);
  };

  const totalFuelLiters = waypoints.reduce((acc, wp) => acc + (wp.fuelBurnLitersPer100Km * (wp.distanceFromOriginKm || 20) / 100), 0);
  const avgSpeed = Math.round(waypoints.reduce((acc, wp) => acc + wp.estSpeedKmh, 0) / waypoints.length);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-teal-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-2xl border border-teal-400/30">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">AI Route Efficiency & Fuel Burn Heatmap</h3>
              <span className="bg-teal-500/30 text-teal-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-teal-400/40 uppercase tracking-wider">
                Live Traffic & Topography
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Evaluates corridor congestion bottlenecks, fuel consumption spikes, and zero-delay AI detours.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!detourApplied ? (
            <button
              type="button"
              onClick={applyAiDetour}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Apply AI Bypass Detour (-18 Mins)
            </button>
          ) : (
            <button
              type="button"
              onClick={resetRoute}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCcw className="w-4 h-4" /> Reset Baseline Route
            </button>
          )}
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Route Distance</span>
            <span className="font-mono font-black text-lg text-slate-900">86.0 km</span>
          </div>
          <MapPin className="w-6 h-6 text-indigo-600" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Est. Fuel Burn</span>
            <span className="font-mono font-black text-lg text-amber-600">{totalFuelLiters.toFixed(1)} Liters</span>
          </div>
          <Fuel className="w-6 h-6 text-amber-500" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Avg Speed</span>
            <span className="font-mono font-black text-lg text-emerald-600">{avgSpeed} km/h</span>
          </div>
          <Zap className="w-6 h-6 text-emerald-500" />
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Route Optimization Status</span>
            <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-md ${detourApplied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {detourApplied ? 'AI Detour Active' : 'Bottleneck Detected'}
            </span>
          </div>
          <Compass className="w-6 h-6 text-teal-600" />
        </div>
      </div>

      {/* Waypoints Breakdown & Heatmap Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Navigation className="w-4 h-4 text-teal-600" /> Corridor Waypoint Efficiency Analysis
          </h4>
          <span className="text-xs text-slate-500 font-medium">Updated live via Telematics Traffic API</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-extrabold text-[10px]">
                <th className="p-3">Waypoint / Junction</th>
                <th className="p-3 text-center">Distance</th>
                <th className="p-3 text-center">Traffic Condition</th>
                <th className="p-3 text-center">Est. Speed</th>
                <th className="p-3 text-center">Fuel Consumption Rate</th>
                <th className="p-3 text-center">CO2 Intensity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {waypoints.map((wp) => (
                <tr key={wp.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    {wp.name}
                  </td>

                  <td className="p-3 text-center font-mono font-semibold text-slate-700">
                    +{wp.distanceFromOriginKm} km
                  </td>

                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      wp.trafficStatus === 'Clear'
                        ? 'bg-emerald-100 text-emerald-800'
                        : wp.trafficStatus === 'Moderate'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800 animate-pulse'
                    }`}>
                      {wp.trafficStatus}
                    </span>
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-slate-800">
                    {wp.estSpeedKmh} km/h
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-amber-700">
                    {wp.fuelBurnLitersPer100Km} L / 100km
                  </td>

                  <td className="p-3 text-center font-mono text-slate-600">
                    {wp.co2GramsPerKm} g CO2/km
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
