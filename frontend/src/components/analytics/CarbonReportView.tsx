import { useState, useMemo } from 'react';
import { Vehicle } from '../../types';
import {
  Leaf, CloudRain, ShieldCheck, TrendingDown, Award, Sparkles,
  BarChart3, PieChart as PieIcon, Download, Printer, Filter, CheckCircle2,
  TreePine, Flame, Zap, ArrowDownRight, Compass
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface CarbonReportViewProps {
  vehicles: Vehicle[];
}

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

export default function CarbonReportView({ vehicles }: CarbonReportViewProps) {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'ytd'>('30d');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('All');

  // Compute CO2 Emissions per vehicle based on odometer, fuel type & fuel level
  const carbonMetrics = useMemo(() => {
    return vehicles.map(v => {
      // Coeff: Diesel ~ 0.85 kg CO2/km, Petrol ~ 0.35 kg/km
      const co2PerKm = v.type === 'Truck' ? 0.85 : v.type === 'Van' ? 0.35 : 0.25;
      const totalKm = v.odometer || 12000;
      const totalCo2Tons = (totalKm * co2PerKm) / 1000;
      const fuelEfficiencyL100 = v.type === 'Truck' ? 28.5 : v.type === 'Van' ? 11.2 : 7.8;
      const ecoScore = Math.max(50, Math.min(99, Math.round(100 - (totalCo2Tons * 1.5) + (v.fuelLevel > 50 ? 5 : 0))));

      return {
        ...v,
        totalKm,
        totalCo2Tons: Math.round(totalCo2Tons * 10) / 10,
        fuelEfficiencyL100,
        ecoScore,
        treesEquivalent: Math.round(totalCo2Tons * 45), // 1 ton CO2 approx offset by ~45 trees/year
      };
    });
  }, [vehicles]);

  const filteredMetrics = useMemo(() => {
    if (selectedVehicleType === 'All') return carbonMetrics;
    return carbonMetrics.filter(m => m.type === selectedVehicleType);
  }, [carbonMetrics, selectedVehicleType]);

  // Total Fleet Aggregates
  const totalCo2EmittedTons = useMemo(() => carbonMetrics.reduce((s, m) => s + m.totalCo2Tons, 0), [carbonMetrics]);
  const totalOffsetTreesNeeded = Math.round(totalCo2EmittedTons * 45);
  const fleetAvgEcoScore = useMemo(() => {
    if (carbonMetrics.length === 0) return 85;
    return Math.round(carbonMetrics.reduce((s, m) => s + m.ecoScore, 0) / carbonMetrics.length);
  }, [carbonMetrics]);

  // CO2 Emissions Breakdown by Vehicle Type
  const co2ByTypeData = useMemo(() => {
    const map = new Map<string, number>();
    carbonMetrics.forEach(m => {
      map.set(m.type, (map.get(m.type) || 0) + m.totalCo2Tons);
    });
    return Array.from(map.entries()).map(([type, totalCo2]) => ({
      type,
      totalCo2: Math.round(totalCo2 * 10) / 10,
    }));
  }, [carbonMetrics]);

  // Monthly CO2 Reduction Trend Mock
  const co2TrendData = [
    { month: 'Jan', baselineCo2: 145, optimizedCo2: 132, savedCo2: 13 },
    { month: 'Feb', baselineCo2: 150, optimizedCo2: 128, savedCo2: 22 },
    { month: 'Mar', baselineCo2: 162, optimizedCo2: 135, savedCo2: 27 },
    { month: 'Apr', baselineCo2: 158, optimizedCo2: 125, savedCo2: 33 },
    { month: 'May', baselineCo2: 170, optimizedCo2: 130, savedCo2: 40 },
    { month: 'Jun', baselineCo2: 165, optimizedCo2: 120, savedCo2: 45 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-800/60 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <Leaf className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Fleet Sustainability & Carbon Emissions Audit</h3>
              <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/40 uppercase tracking-wider">
                ESG Grade A
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Net-Zero carbon tracking, CO2 fuel burn analytics, and ICAO CORSIA / ISO 14064 offset accounting.
            </p>
          </div>
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <button
            type="button"
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              timeRange === '30d' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            30 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('90d')}
            className={`px-3 py-1 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              timeRange === '90d' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Quarter
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('ytd')}
            className={`px-3 py-1 text-xs font-extrabold rounded-xl transition cursor-pointer ${
              timeRange === 'ytd' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            YTD 2026
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Total CO2 Emitted</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CloudRain className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {totalCo2EmittedTons.toLocaleString()} <span className="text-xs font-normal text-slate-500">MT</span>
          </h3>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
            <ArrowDownRight className="w-3 h-3" /> -12.4% vs last quarter
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Tree Offset Requirement</p>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <TreePine className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-teal-700 mt-1">
            {totalOffsetTreesNeeded.toLocaleString()} <span className="text-xs font-normal text-slate-500">trees</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Annual absorption offset ratio</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Fleet Eco-Driving Quotient</p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {fleetAvgEcoScore} <span className="text-xs font-normal text-slate-500">/ 100</span>
          </h3>
          <span className="text-[10px] text-indigo-600 font-bold">Optimized route compliance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Eco-Route Fuel Savings</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
            180 MT <span className="text-xs font-normal text-slate-500">CO2 avoided</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Via dynamic traffic bypasses</span>
        </div>
      </div>

      {/* Recharts Trend & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CO2 Emissions Trend Area Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" /> CO2 Reduction Trend (Baseline vs Optimized)
            </h4>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              -27% Carbon Savings
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={co2TrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${val} MT`} />
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} MT CO2`, name === 'baselineCo2' ? 'Unoptimized Baseline' : 'Optimized Emissions']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Area type="monotone" dataKey="baselineCo2" stroke="#94a3b8" fill="#f1f5f9" strokeWidth={2} />
                <Area type="monotone" dataKey="optimizedCo2" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CO2 Emissions Share by Vehicle Class */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-600" /> Carbon Share by Fleet Vehicle Class
            </h4>
            <span className="text-[10px] font-bold text-slate-400">Total MT Distribution</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={co2ByTypeData}
                  dataKey="totalCo2"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {co2ByTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} MT CO2`, 'Class Carbon Output']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Per-Vehicle Carbon & Eco-Score Ledger */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">Vehicle Unit Carbon Audit & Eco-Quotient Ledger</h4>
            <p className="text-xs text-slate-500">Individual vehicle odometer distance, fuel burn efficiency, and CO2 footprint.</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">Vehicle Asset</th>
                <th className="p-3 text-center">Class / Type</th>
                <th className="p-3 text-center">Odometer (km)</th>
                <th className="p-3 text-right">Avg Fuel Burn</th>
                <th className="p-3 text-right">Estimated CO2</th>
                <th className="p-3 text-center">Tree Offset</th>
                <th className="p-3 text-center">Eco Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMetrics.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition">
                  <td className="p-3">
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{v.name}</p>
                      <span className="font-mono text-[10px] text-slate-400">{v.licensePlate}</span>
                    </div>
                  </td>

                  <td className="p-3 text-center text-slate-600 font-semibold">{v.type}</td>

                  <td className="p-3 text-center font-mono font-bold text-slate-800">
                    {v.totalKm.toLocaleString()} km
                  </td>

                  <td className="p-3 text-right font-mono text-slate-700">
                    {v.fuelEfficiencyL100} L/100km
                  </td>

                  <td className="p-3 text-right font-mono font-bold text-emerald-700">
                    {v.totalCo2Tons} MT
                  </td>

                  <td className="p-3 text-center font-mono text-teal-700 font-bold">
                    🌳 {v.treesEquivalent}
                  </td>

                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      v.ecoScore >= 85
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : v.ecoScore >= 70
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {v.ecoScore} / 100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VERIFIED CARBON OFFSET PROJECTS MARKETPLACE */}
      <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-6 rounded-3xl border border-emerald-800/80 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-800/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <TreePine className="w-5 h-5 text-emerald-400" />
              <h4 className="font-extrabold text-base text-white">Verified ESG Net-Zero Carbon Offset Marketplace</h4>
            </div>
            <p className="text-xs text-emerald-200/80 mt-1">
              Mitigate remaining fleet carbon liability ({totalCo2EmittedTons.toFixed(1)} MT CO2) via UN/Gold Standard certified climate projects.
            </p>
          </div>

          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl flex items-center gap-3 shrink-0">
            <div>
              <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">Required Net-Zero Credits</span>
              <span className="font-mono font-black text-lg text-emerald-300">{totalCo2EmittedTons.toFixed(0)} Credits (MT)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/90 border border-emerald-800/60 p-4 rounded-2xl space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-2xl">🌱</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Gold Standard
              </span>
            </div>
            <div>
              <h5 className="font-extrabold text-sm text-white">Southeast Asia Mangrove Reforestation</h5>
              <p className="text-[11px] text-slate-300 mt-1">Coastal blue carbon sequestration & biodiversity restoration in Sabah & Sumatra.</p>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-emerald-400">$12 / MT CO2</span>
              <button
                type="button"
                onClick={() => alert(`Purchased ${totalCo2EmittedTons.toFixed(0)} Mangrove Carbon Offset Credits! ISO 14064 Certificate Generated.`)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition cursor-pointer"
              >
                Offset ${Math.round(totalCo2EmittedTons * 12).toLocaleString()}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-emerald-800/60 p-4 rounded-2xl space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-2xl">💨</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Verra VCS
              </span>
            </div>
            <div>
              <h5 className="font-extrabold text-sm text-white">Regional Offshore Wind Power Generation</h5>
              <p className="text-[11px] text-slate-300 mt-1">Replacing coal-fired grid energy with 250MW offshore wind turbine arrays.</p>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-teal-400">$15 / MT CO2</span>
              <button
                type="button"
                onClick={() => alert(`Purchased ${totalCo2EmittedTons.toFixed(0)} Wind Power Carbon Offset Credits! ISO 14064 Certificate Generated.`)}
                className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl transition cursor-pointer"
              >
                Offset ${Math.round(totalCo2EmittedTons * 15).toLocaleString()}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-emerald-800/60 p-4 rounded-2xl space-y-3">
            <div className="flex items-start justify-between">
              <span className="text-2xl">☀️</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                UN CDM
              </span>
            </div>
            <div>
              <h5 className="font-extrabold text-sm text-white">Industrial Solar Farm & Methane Capture</h5>
              <p className="text-[11px] text-slate-300 mt-1">Converting agricultural waste biogas into clean baseline electricity.</p>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-amber-400">$10 / MT CO2</span>
              <button
                type="button"
                onClick={() => alert(`Purchased ${totalCo2EmittedTons.toFixed(0)} Solar Biogas Carbon Offset Credits! ISO 14064 Certificate Generated.`)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition cursor-pointer"
              >
                Offset ${Math.round(totalCo2EmittedTons * 10).toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
