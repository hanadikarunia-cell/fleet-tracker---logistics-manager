import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { InventoryItem } from '../../types';
import {
  TrendingUp, AlertTriangle, CheckCircle2, Clock, Sparkles,
  Search, Filter, ShieldAlert, ArrowUpRight, ShieldCheck
} from 'lucide-react';

interface InventoryForecastingViewProps {
  items: InventoryItem[];
  allCategories: string[];
  onTriggerReorderForSku?: (sku: string) => void;
}

export default function InventoryForecastingView({
  items,
  allCategories,
  onTriggerReorderForSku,
}: InventoryForecastingViewProps) {
  const [horizonDays, setHorizonDays] = useState<30 | 60 | 90>(30);
  const [seasonalFactor, setSeasonalFactor] = useState<'standard' | 'peak' | 'monsoon' | 'expansion'>('standard');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Seasonal Multipliers
  const seasonalMultipliers: Record<string, { multiplier: number; label: string; desc: string }> = {
    standard: { multiplier: 1.0, label: 'Standard Operational Baseline (1.0x)', desc: 'Normal steady-state consumption rate' },
    peak: { multiplier: 1.45, label: 'Q3/Q4 Aviation Peak (+45%)', desc: 'High passenger flight & cargo charter volume' },
    monsoon: { multiplier: 0.8, label: 'Monsoon Season Delay (-20%)', desc: 'Reduced flight frequencies & restricted dispatches' },
    expansion: { multiplier: 1.3, label: 'Fleet Route Expansion (+30%)', desc: 'New regional route launches & asset deployment' },
  };

  const currentMultiplier = seasonalMultipliers[seasonalFactor].multiplier;

  // Forecast Calculations
  const forecastData = useMemo(() => {
    return items.map((item) => {
      const minLevel = item.minStockLevel ?? 5;
      // Estimate baseline daily burn rate based on category and min level
      const baseDailyBurn = Math.max(0.5, Math.round((minLevel / 5) * 10) / 10);
      const effectiveDailyBurn = Math.round(baseDailyBurn * currentMultiplier * 10) / 10;
      
      const projectedHorizonDemand = Math.ceil(effectiveDailyBurn * horizonDays);
      const projectedBalance = item.quantity - projectedHorizonDemand;
      
      const daysUntilDepletion = effectiveDailyBurn > 0 ? Math.floor(item.quantity / effectiveDailyBurn) : 999;
      
      const today = new Date();
      const depletionDate = new Date(today);
      depletionDate.setDate(today.getDate() + daysUntilDepletion);
      
      let riskStatus: 'critical' | 'warning' | 'safe' = 'safe';
      if (projectedBalance <= 0 || daysUntilDepletion <= horizonDays) {
        riskStatus = 'critical';
      } else if (projectedBalance <= minLevel) {
        riskStatus = 'warning';
      }

      return {
        item,
        effectiveDailyBurn,
        projectedHorizonDemand,
        projectedBalance,
        daysUntilDepletion,
        depletionDateFormatted: daysUntilDepletion < 365 
          ? depletionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Sufficient (>1 Year)',
        riskStatus,
        recommendedSafetyBuffer: Math.ceil(effectiveDailyBurn * 7), // 7 days safety buffer
      };
    });
  }, [items, horizonDays, currentMultiplier]);

  // Filtered forecast list
  const filteredForecasts = useMemo(() => {
    return forecastData.filter((f) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term || 
        f.item.name.toLowerCase().includes(term) || 
        f.item.sku.toLowerCase().includes(term) ||
        f.item.category.toLowerCase().includes(term);

      const matchesCat = categoryFilter === 'All' || f.item.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [forecastData, searchTerm, categoryFilter]);

  // Aggregate Metrics
  const totalForecastedUnits = useMemo(() => forecastData.reduce((sum, f) => sum + f.projectedHorizonDemand, 0), [forecastData]);
  const criticalDepletionCount = useMemo(() => forecastData.filter(f => f.riskStatus === 'critical').length, [forecastData]);
  const warningCount = useMemo(() => forecastData.filter(f => f.riskStatus === 'warning').length, [forecastData]);
  const safeCount = useMemo(() => forecastData.filter(f => f.riskStatus === 'safe').length, [forecastData]);

  // Chart Trajectory Data (Current vs Projected Trajectory over 90 days)
  const trajectoryChartData = useMemo(() => {
    const timepoints = [0, 10, 20, 30, 45, 60, 75, 90];
    return timepoints.map((day) => {
      const totalStock = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalDailyBurn = forecastData.reduce((sum, f) => sum + f.effectiveDailyBurn, 0);
      const projectedAggregate = Math.max(0, Math.round(totalStock - (totalDailyBurn * day)));
      const safetyBufferLine = forecastData.reduce((sum, f) => sum + f.recommendedSafetyBuffer, 0);

      return {
        day: `Day ${day}`,
        'Projected Aggregate Stock': projectedAggregate,
        'Safety Buffer Threshold': safetyBufferLine,
      };
    });
  }, [items, forecastData]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-5 rounded-3xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <TrendingUp className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-base text-white">AI Smart Inventory Demand Forecasting</h3>
            <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/40 uppercase tracking-wider">
              Predictive Run-Rate
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Predict inventory depletion velocity, projected stockouts, and seasonal safety buffer requirements across future operational cycles.
          </p>
        </div>

        {/* Time Horizon & Seasonal Multiplier Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Horizon Toggle */}
          <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1">
            {[30, 60, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setHorizonDays(days as 30 | 60 | 90)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  horizonDays === days
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>

          {/* Seasonal Multiplier Dropdown */}
          <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <select
              value={seasonalFactor}
              onChange={(e) => setSeasonalFactor(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-200 outline-none px-2 py-1 cursor-pointer"
            >
              {Object.entries(seasonalMultipliers).map(([key, info]) => (
                <option key={key} value={key} className="bg-slate-900 text-white">
                  {info.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Forecasted Horizon Demand</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
            {totalForecastedUnits.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Estimated consumption in {horizonDays} days</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Critical Stockout Risk</p>
          <h3 className={`text-2xl font-bold mt-0.5 ${criticalDepletionCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {criticalDepletionCount} <span className="text-xs font-normal text-slate-500">SKUs</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Predicted depletion before Day {horizonDays}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Warning Buffer SKUs</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-0.5">
            {warningCount} <span className="text-xs font-normal text-slate-500">SKUs</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Nearing minimum safety threshold</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Seasonal Factor Active</p>
          <h3 className="text-2xl font-bold text-indigo-600 mt-0.5">{currentMultiplier}x</h3>
          <span className="text-[10px] text-slate-400 font-medium truncate block">{seasonalMultipliers[seasonalFactor].desc}</span>
        </div>
      </div>

      {/* Aggregate Projection Trajectory Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">Projected Aggregate Stock Depletion Trajectory (90-Day Outlook)</h4>
            <p className="text-xs text-slate-500">Simulated total inventory volume decrease over time against safety buffer limits.</p>
          </div>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
            Burn Rate: {currentMultiplier}x Seasonal
          </span>
        </div>

        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trajectoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area type="monotone" dataKey="Projected Aggregate Stock" fill="#6366f1" stroke="#4f46e5" fillOpacity={0.15} />
              <Line type="monotone" dataKey="Safety Buffer Threshold" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per SKU Forecast Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Table Search & Filter Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search SKU or Item Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Forecast Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">SKU & Item Details</th>
                <th className="p-3 text-center">Current Stock</th>
                <th className="p-3 text-center">Est. Daily Burn</th>
                <th className="p-3 text-center">{horizonDays}-Day Demand</th>
                <th className="p-3 text-center">Projected Balance</th>
                <th className="p-3 text-center">Est. Depletion Date</th>
                <th className="p-3 text-center">Risk Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredForecasts.map((row) => {
                const isCritical = row.riskStatus === 'critical';
                const isWarning = row.riskStatus === 'warning';

                return (
                  <tr key={row.item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">{row.item.sku}</span>
                        <p className="font-bold text-slate-800 text-xs">{row.item.name}</p>
                        <span className="text-[10px] text-slate-500">{row.item.category}</span>
                      </div>
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      {row.item.quantity}
                    </td>

                    <td className="p-3 text-center font-mono text-slate-600">
                      {row.effectiveDailyBurn} <span className="text-[9px] text-slate-400">/day</span>
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-indigo-700">
                      {row.projectedHorizonDemand}
                    </td>

                    <td className="p-3 text-center font-mono font-bold">
                      <span className={row.projectedBalance <= 0 ? 'text-rose-600' : 'text-slate-800'}>
                        {row.projectedBalance}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-slate-700">{row.depletionDateFormatted}</span>
                        {row.daysUntilDepletion <= horizonDays && (
                          <span className="text-[9px] text-rose-600 font-extrabold">In {row.daysUntilDepletion} days</span>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        isCritical
                          ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                          : isWarning
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {isCritical && <ShieldAlert className="w-3 h-3" />}
                        {isWarning && <Clock className="w-3 h-3" />}
                        {!isCritical && !isWarning && <ShieldCheck className="w-3 h-3" />}
                        {isCritical ? 'Depletion Risk' : isWarning ? 'Low Buffer' : 'Safe Stock'}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      {onTriggerReorderForSku && (
                        <button
                          type="button"
                          onClick={() => onTriggerReorderForSku(row.item.sku)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer ${
                            isCritical
                              ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Reorder
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredForecasts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No matching forecasting items found for current search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
