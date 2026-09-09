import { useState, useMemo } from 'react';
import { InventoryItem } from '../../types';
import {
  DollarSign, PieChart as PieIcon, BarChart3, TrendingUp, TrendingDown,
  Coins, Building2, Package, Sparkles, Filter, ShieldAlert, Layers
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface InventoryCostAnalyticsViewProps {
  items: InventoryItem[];
  allCategories: string[];
}

// Default unit cost mapping by category
const CATEGORY_UNIT_COSTS: Record<string, number> = {
  Electronics: 450,
  'Spare Parts': 1200,
  Cargo: 85,
  Tools: 180,
  Hazmat: 320,
};

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function InventoryCostAnalyticsView({
  items,
  allCategories,
}: InventoryCostAnalyticsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Compute Cost Metrics per Item
  const itemCostData = useMemo(() => {
    return items.map(item => {
      const estimatedUnitCost = CATEGORY_UNIT_COSTS[item.category] || 150;
      const totalItemValue = item.quantity * estimatedUnitCost;
      const minLevel = item.minStockLevel || 5;
      const holdingRisk = item.quantity > minLevel * 4 ? 'overstocked' : item.quantity < minLevel ? 'understocked' : 'balanced';

      return {
        ...item,
        estimatedUnitCost,
        totalItemValue,
        holdingRisk,
      };
    });
  }, [items]);

  // Filtered Item Costs
  const filteredItemCosts = useMemo(() => {
    if (selectedCategory === 'All') return itemCostData;
    return itemCostData.filter(i => i.category === selectedCategory);
  }, [itemCostData, selectedCategory]);

  // Aggregate Category Cost Breakdown
  const categoryCostBreakdown = useMemo(() => {
    const map = new Map<string, { category: string; totalUnits: number; totalValue: number; itemCount: number }>();

    itemCostData.forEach(item => {
      const existing = map.get(item.category) || { category: item.category, totalUnits: 0, totalValue: 0, itemCount: 0 };
      existing.totalUnits += item.quantity;
      existing.totalValue += item.totalItemValue;
      existing.itemCount += 1;
      map.set(item.category, existing);
    });

    return Array.from(map.values());
  }, [itemCostData]);

  // Aggregate Location Cost Breakdown
  const locationCostBreakdown = useMemo(() => {
    const map = new Map<string, { location: string; totalValue: number; totalUnits: number }>();

    itemCostData.forEach(item => {
      const loc = item.location || 'Kuala Lumpur HQ Depot';
      const existing = map.get(loc) || { location: loc, totalValue: 0, totalUnits: 0 };
      existing.totalValue += item.totalItemValue;
      existing.totalUnits += item.quantity;
      map.set(loc, existing);
    });

    return Array.from(map.values());
  }, [itemCostData]);

  // High-Level KPIs
  const totalPortfolioValue = useMemo(() => itemCostData.reduce((sum, i) => sum + i.totalItemValue, 0), [itemCostData]);
  const totalStockUnits = useMemo(() => itemCostData.reduce((sum, i) => sum + i.quantity, 0), [itemCostData]);
  const averageUnitValue = totalStockUnits > 0 ? Math.round(totalPortfolioValue / totalStockUnits) : 0;
  const overstockedCapital = useMemo(() => {
    return itemCostData
      .filter(i => i.holdingRisk === 'overstocked')
      .reduce((sum, i) => sum + i.totalItemValue, 0);
  }, [itemCostData]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
            <DollarSign className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Inventory Cost & Capital Valuation Analytics</h3>
              <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/40 uppercase tracking-wider">
                Financial Audit
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Financial exposure dashboard analyzing total stock asset valuation, category capital allocation, and idle holding cost risks.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-200 outline-none px-2 py-1 cursor-pointer"
          >
            <option value="All" className="bg-slate-900 text-white">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Total Inventory Asset Valuation</p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            ${totalPortfolioValue.toLocaleString()}
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">{totalStockUnits.toLocaleString()} units in catalog</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Average Unit Asset Value</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            ${averageUnitValue.toLocaleString()} <span className="text-xs font-normal text-slate-500">/unit</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Weighted unit capital cost</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Overstocked Capital Exposure</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
            ${overstockedCapital.toLocaleString()}
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Excess stock above 4x min buffer</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <p className="text-xs text-slate-500 font-medium">Top Capital Allocation</p>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
            {categoryCostBreakdown.sort((a, b) => b.totalValue - a.totalValue)[0]?.category || 'Spare Parts'}
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">Highest value category share</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Capital Allocation Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" /> Capital Valuation by Category ($)
            </h4>
            <span className="text-[10px] font-bold text-slate-400">Total Asset Value</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryCostBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Total Valuation']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Bar dataKey="totalValue" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Location Holding Valuation Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" /> Capital Distribution by Location / Depot
            </h4>
            <span className="text-[10px] font-bold text-slate-400">Hub Storage Share</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={locationCostBreakdown}
                  dataKey="totalValue"
                  nameKey="location"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ name, percent }: any) => `${name?.slice(0, 15)}... (${(percent * 100).toFixed(0)}%)`}
                >
                  {locationCostBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Location Asset Value']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Item-Level Cost Valuation Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">SKU Item Asset Valuation Master Ledger</h4>
            <p className="text-xs text-slate-500">Per-unit estimated pricing and aggregate asset capital distribution.</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3">SKU & Item Name</th>
                <th className="p-3 text-center">Category</th>
                <th className="p-3 text-center">Stock Qty</th>
                <th className="p-3 text-right">Est. Unit Cost</th>
                <th className="p-3 text-right">Total Valuation</th>
                <th className="p-3 text-center">% Portfolio Share</th>
                <th className="p-3 text-center">Holding Capital Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItemCosts.map((item) => {
                const sharePct = totalPortfolioValue > 0 ? ((item.totalItemValue / totalPortfolioValue) * 100).toFixed(1) : '0';

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">{item.sku}</span>
                        <p className="font-bold text-slate-800 text-xs">{item.name}</p>
                        <span className="text-[10px] text-slate-500">{item.location}</span>
                      </div>
                    </td>

                    <td className="p-3 text-center text-slate-600 font-semibold">{item.category}</td>

                    <td className="p-3 text-center font-mono font-bold text-slate-800">{item.quantity}</td>

                    <td className="p-3 text-right font-mono font-bold text-slate-700">
                      ${item.estimatedUnitCost.toLocaleString()}
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-indigo-700 text-sm">
                      ${item.totalItemValue.toLocaleString()}
                    </td>

                    <td className="p-3 text-center font-mono text-slate-600 font-bold">
                      {sharePct}%
                    </td>

                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        item.holdingRisk === 'overstocked'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : item.holdingRisk === 'understocked'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {item.holdingRisk === 'overstocked' ? 'Overstocked Capital' : item.holdingRisk === 'understocked' ? 'Stockout Risk' : 'Balanced Buffer'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
