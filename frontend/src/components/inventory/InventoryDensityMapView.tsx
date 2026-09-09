import { useState, useMemo } from 'react';
import { InventoryItem, Vehicle } from '../../types';
import {
  Layers, Warehouse, Truck, Package, Info, CheckCircle2,
  AlertTriangle, Flame, X, Scale, Box, ArrowUpRight
} from 'lucide-react';

interface InventoryDensityMapViewProps {
  items: InventoryItem[];
  vehicles: Vehicle[];
}

interface CapacityLocationHub {
  id: string;
  name: string;
  type: 'warehouse' | 'vehicle';
  maxWeightKg: number;
  maxVolumeM3: number;
}

export default function InventoryDensityMapView({
  items,
  vehicles,
}: InventoryDensityMapViewProps) {
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);

  // Define location hubs with realistic volumetric & weight limits
  const locationHubs: CapacityLocationHub[] = useMemo(() => {
    const hubs: CapacityLocationHub[] = [
      { id: 'wh_tng', name: 'Tangerang HQ Depot', type: 'warehouse', maxWeightKg: 15000, maxVolumeM3: 500 },
      { id: 'wh_bdo', name: 'Bandung Regional Hub', type: 'warehouse', maxWeightKg: 8000, maxVolumeM3: 300 },
      { id: 'wh_bks', name: 'Bekasi Distribution Center', type: 'warehouse', maxWeightKg: 10000, maxVolumeM3: 350 },
    ];

    vehicles.forEach(v => {
      hubs.push({
        id: v.id,
        name: `${v.name} (${v.licensePlate})`,
        type: 'vehicle',
        maxWeightKg: v.maxCargoWeight || 3500,
        maxVolumeM3: 25, // m3 cargo bay volume for transport vehicle
      });
    });

    return hubs;
  }, [vehicles]);

  // Compute storage utilization for each hub
  const hubDensityStats = useMemo(() => {
    return locationHubs.map(hub => {
      const storedItems = items.filter(item => {
        if (hub.type === 'vehicle') {
          return item.assignedVehicleId === hub.id;
        } else {
          // Warehouses: match unassigned or specific location string
          if (hub.id === 'wh_tng') return !item.assignedVehicleId || item.location.includes('Tangerang') || item.location.includes('HQ');
          if (hub.id === 'wh_bdo') return item.location.includes('Bandung');
          if (hub.id === 'wh_bks') return item.location.includes('Bekasi');
          return false;
        }
      });

      const totalWeightKg = Math.round(storedItems.reduce((sum, i) => sum + (i.quantity * i.unitWeight), 0) * 10) / 10;
      // Estimate volume based on unit weight (average 0.015 m3 per kg)
      const totalVolumeM3 = Math.round(storedItems.reduce((sum, i) => sum + (i.quantity * i.unitWeight * 0.015), 0) * 10) / 10;
      
      const weightFillPct = Math.min(100, Math.round((totalWeightKg / hub.maxWeightKg) * 100));
      const volumeFillPct = Math.min(100, Math.round((totalVolumeM3 / hub.maxVolumeM3) * 100));
      const primaryFillPct = Math.max(weightFillPct, volumeFillPct);

      let status: 'optimal' | 'high' | 'critical' = 'optimal';
      if (primaryFillPct >= 85) status = 'critical';
      else if (primaryFillPct >= 70) status = 'high';

      return {
        hub,
        storedItems,
        totalWeightKg,
        totalVolumeM3,
        weightFillPct,
        volumeFillPct,
        primaryFillPct,
        status,
        remainingWeightBuffer: Math.max(0, hub.maxWeightKg - totalWeightKg),
      };
    });
  }, [locationHubs, items]);

  const activeSelectedHub = useMemo(() => {
    if (!selectedHubId) return null;
    return hubDensityStats.find(h => h.hub.id === selectedHubId) || null;
  }, [selectedHubId, hubDensityStats]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-slate-800 text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Storage Capacity & Density Map</h3>
              <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/40 uppercase tracking-wider">
                Volumetric Payload
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Spatial fill density visualizer tracking cubic volume (m³) and payload weight (kg) capacity buffers across regional depots and active fleet holds.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-slate-800 shrink-0">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Optimal (&lt;70%)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> High (70-85%)
          </span>
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block animate-pulse" /> Heavy (&gt;85%)
          </span>
        </div>
      </div>

      {/* Grid of Location Density Hub Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {hubDensityStats.map(({ hub, storedItems, totalWeightKg, totalVolumeM3, weightFillPct, volumeFillPct, primaryFillPct, status }) => {
          const isCritical = status === 'critical';
          const isHigh = status === 'high';

          return (
            <div
              key={hub.id}
              onClick={() => setSelectedHubId(hub.id)}
              className={`bg-white rounded-2xl border p-5 shadow-sm transition hover:shadow-md cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-4 ${
                isCritical
                  ? 'border-rose-300 ring-2 ring-rose-400/20'
                  : isHigh
                    ? 'border-amber-300'
                    : 'border-slate-100 hover:border-emerald-300'
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${
                      hub.type === 'warehouse' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {hub.type === 'warehouse' ? <Warehouse className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{hub.name}</h4>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        {hub.type === 'warehouse' ? 'Depot Warehouse' : 'Active Fleet Cargo Hold'}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                    isCritical
                      ? 'bg-rose-100 text-rose-700'
                      : isHigh
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {primaryFillPct}% Full
                  </span>
                </div>

                {/* Fill Percentage Visual Progress Bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Storage Fill Density</span>
                    <span className={isCritical ? 'text-rose-600' : isHigh ? 'text-amber-600' : 'text-emerald-600'}>
                      {primaryFillPct}% Capacity
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCritical ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${primaryFillPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Payload & Volume Stats */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-600">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                    <Scale className="w-3 h-3 text-slate-400" /> Payload Weight
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {totalWeightKg.toLocaleString()} / {hub.maxWeightKg.toLocaleString()} kg
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                    <Box className="w-3 h-3 text-slate-400" /> Cubic Volume
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {totalVolumeM3} / {hub.maxVolumeM3} m³
                  </span>
                </div>
              </div>

              {/* Bottom SKUs stored tag */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium">
                  {storedItems.length} SKUs Assigned ({storedItems.reduce((s, i) => s + i.quantity, 0)} units)
                </span>
                <span className="text-indigo-600 font-bold flex items-center gap-1 text-[11px] group-hover:underline">
                  Inspect Bay <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hub Spatial Detail Drawer Modal */}
      {activeSelectedHub && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white max-w-2xl w-full rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${
                  activeSelectedHub.hub.type === 'warehouse' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {activeSelectedHub.hub.type === 'warehouse' ? <Warehouse className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{activeSelectedHub.hub.name}</h3>
                  <p className="text-xs text-slate-500">Spatial Cargo Manifest & Load Distribution Breakdown</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHubId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Density Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-bold text-[10px] uppercase block">Total Weight Stored</span>
                <span className="font-mono font-extrabold text-slate-800 text-sm">{activeSelectedHub.totalWeightKg} kg</span>
                <span className="text-[10px] text-slate-500 block">Cap: {activeSelectedHub.hub.maxWeightKg} kg</span>
              </div>

              <div>
                <span className="text-slate-400 font-bold text-[10px] uppercase block">Volume Occupied</span>
                <span className="font-mono font-extrabold text-slate-800 text-sm">{activeSelectedHub.totalVolumeM3} m³</span>
                <span className="text-[10px] text-slate-500 block">Cap: {activeSelectedHub.hub.maxVolumeM3} m³</span>
              </div>

              <div>
                <span className="text-slate-400 font-bold text-[10px] uppercase block">Payload Headroom</span>
                <span className="font-mono font-extrabold text-emerald-600 text-sm">{activeSelectedHub.remainingWeightBuffer} kg</span>
                <span className="text-[10px] text-slate-500 block">Available Buffer</span>
              </div>
            </div>

            {/* Stored Cargo Items Table */}
            <div>
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide mb-2">Stored SKUs Manifest</h4>
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="p-2.5">SKU & Item</th>
                      <th className="p-2.5 text-center">Category</th>
                      <th className="p-2.5 text-center">Quantity</th>
                      <th className="p-2.5 text-right">Total Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeSelectedHub.storedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2.5">
                          <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">{item.sku}</span>
                          <p className="font-bold text-slate-800 text-xs">{item.name}</p>
                        </td>
                        <td className="p-2.5 text-center text-slate-600">{item.category}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-800">{item.quantity}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                          {Math.round(item.quantity * item.unitWeight * 10) / 10} kg
                        </td>
                      </tr>
                    ))}

                    {activeSelectedHub.storedItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400 font-medium">
                          No cargo items currently assigned to this hub.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedHubId(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800"
              >
                Close Visualizer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
