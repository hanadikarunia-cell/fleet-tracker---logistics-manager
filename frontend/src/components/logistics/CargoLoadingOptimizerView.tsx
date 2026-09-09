import { useState, useMemo, FormEvent } from 'react';
import { Vehicle } from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Boxes, ShieldAlert, Sparkles, CheckCircle2, ArrowRight,
  Scale, AlertTriangle, Layers, RotateCcw, Weight, Truck, Maximize2, Plus, Trash2, BarChart2
} from 'lucide-react';

interface CargoItem {
  id: string;
  description: string;
  weightKg: number;
  volumeM3: number;
  positionPosition: 'Front' | 'Middle' | 'Rear';
  isHazardous: boolean;
  isFragile: boolean;
}

const INITIAL_CARGO_MANIFEST: CargoItem[] = [
  { id: 'c1', description: 'Avionics Spares & Turbines Box A', weightKg: 1850, volumeM3: 4.2, positionPosition: 'Front', isHazardous: false, isFragile: true },
  { id: 'c2', description: 'Industrial Lithium Power Pack Pallet', weightKg: 2400, volumeM3: 3.8, positionPosition: 'Middle', isHazardous: true, isFragile: false },
  { id: 'c3', description: 'Cold Chain Pharmaceutical Crate', weightKg: 1200, volumeM3: 2.5, positionPosition: 'Rear', isHazardous: false, isFragile: true },
  { id: 'c4', description: 'General E-Commerce Freight Pallets', weightKg: 1500, volumeM3: 5.0, positionPosition: 'Middle', isHazardous: false, isFragile: false },
];

interface CargoLoadingOptimizerProps {
  vehicles: Vehicle[];
}

export default function CargoLoadingOptimizerView({ vehicles }: CargoLoadingOptimizerProps) {
  const [cargoItems, setCargoItems] = useState<CargoItem[]>(INITIAL_CARGO_MANIFEST);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || 'V1');
  const [optimized, setOptimized] = useState(false);

  // Form for adding new item
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemWeight, setNewItemWeight] = useState(800);
  const [newItemVol, setNewItemVol] = useState(2.0);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
  const maxPayloadCapacityKg = selectedVehicle ? (selectedVehicle.maxPayloadKg || 8000) : 8000;

  // Calculate Weight Distribution & Center of Gravity
  const totalWeightKg = useMemo(() => {
    return cargoItems.reduce((acc, item) => acc + item.weightKg, 0);
  }, [cargoItems]);

  const totalVolumeM3 = useMemo(() => {
    return cargoItems.reduce((acc, item) => acc + item.volumeM3, 0);
  }, [cargoItems]);

  const frontAxleWeightKg = useMemo(() => {
    return cargoItems.reduce((acc, item) => {
      if (item.positionPosition === 'Front') return acc + item.weightKg * 0.8;
      if (item.positionPosition === 'Middle') return acc + item.weightKg * 0.45;
      return acc + item.weightKg * 0.15;
    }, 1500); // Tare front axle weight
  }, [cargoItems]);

  const rearAxleWeightKg = useMemo(() => {
    return cargoItems.reduce((acc, item) => {
      if (item.positionPosition === 'Rear') return acc + item.weightKg * 0.85;
      if (item.positionPosition === 'Middle') return acc + item.weightKg * 0.55;
      return acc + item.weightKg * 0.2;
    }, 2200); // Tare rear axle weight
  }, [cargoItems]);

  // Compute Bay Zone chart data for Recharts
  const bayZoneChartData = useMemo(() => {
    const zones = ['Front', 'Middle', 'Rear'] as const;
    return zones.map(zone => {
      const items = cargoItems.filter(i => i.positionPosition === zone);
      const weight = items.reduce((a, b) => a + b.weightKg, 0);
      const volume = items.reduce((a, b) => a + b.volumeM3, 0);
      return {
        zone: `${zone} Bay Zone`,
        weightKg: weight,
        volumeM3: Math.round(volume * 10) / 10,
        itemCount: items.length,
      };
    });
  }, [cargoItems]);

  const cogOffsetPct = Math.min(100, Math.max(0, Math.round((frontAxleWeightKg / (frontAxleWeightKg + rearAxleWeightKg)) * 100)));

  const handleOptimizeLayout = () => {
    // Rebalance heavy items to middle & front to balance axles
    const rebalanced = cargoItems.map(item => {
      if (item.weightKg > 2000) {
        return { ...item, positionPosition: 'Middle' as const };
      }
      if (item.isFragile) {
        return { ...item, positionPosition: 'Front' as const };
      }
      return item;
    });
    setCargoItems(rebalanced);
    setOptimized(true);
  };

  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newItemDesc.trim()) return;

    const newItem: CargoItem = {
      id: `c_${Date.now()}`,
      description: newItemDesc,
      weightKg: Number(newItemWeight),
      volumeM3: Number(newItemVol),
      positionPosition: 'Middle',
      isHazardous: false,
      isFragile: false,
    };

    setCargoItems([...cargoItems, newItem]);
    setNewItemDesc('');
  };

  const handleRemoveItem = (id: string) => {
    setCargoItems(cargoItems.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-indigo-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-400/30">
            <Boxes className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">Smart Axle & Cargo Load Distribution Optimizer</h3>
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/40 uppercase tracking-wider">
                GVM & CoG Balance
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Optimizes trailer axle weight bias, center of gravity offset, and volume utilization to prevent rollover risks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="p-2.5 border border-slate-700 bg-slate-900 text-white rounded-xl text-xs font-extrabold outline-none"
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} (Max: {(v.maxPayloadKg || 8000).toLocaleString()} kg)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleOptimizeLayout}
            className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Auto-Pack & Balance CoG
          </button>
        </div>
      </div>

      {/* Load Capacity Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-slate-700">Gross Payload Weight</span>
            <span className="font-mono font-black text-indigo-600">{totalWeightKg.toLocaleString()} / {maxPayloadCapacityKg.toLocaleString()} kg</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                totalWeightKg > maxPayloadCapacityKg ? 'bg-rose-600' : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(100, (totalWeightKg / maxPayloadCapacityKg) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-slate-700">Front Axle Load</span>
            <span className="font-mono font-black text-slate-800">{Math.round(frontAxleWeightKg).toLocaleString()} kg</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (frontAxleWeightKg / 5000) * 100)}%` }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-slate-700">Rear Axle Load</span>
            <span className="font-mono font-black text-slate-800">{Math.round(rearAxleWeightKg).toLocaleString()} kg</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (rearAxleWeightKg / 6000) * 100)}%` }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-slate-700">CoG Balance Ratio</span>
            <span className="font-mono font-black text-emerald-600">{cogOffsetPct}% Front / {100 - cogOffsetPct}% Rear</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-indigo-600" style={{ width: `${cogOffsetPct}%` }} />
            <div className="h-full bg-slate-300" style={{ width: `${100 - cogOffsetPct}%` }} />
          </div>
        </div>
      </div>

      {/* Visual Cargo Bay Diagram */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Truck className="w-4 h-4 text-indigo-600" /> Interactive Trailer Bay Load Spatial Layout
        </h4>

        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4 text-white">
          <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-widest border-b border-slate-800 pb-2">
            <span>◄ FRONT AXLE (Cab)</span>
            <span>CENTER OF GRAVITY BAY</span>
            <span>REAR AXLE (Tailgate) ►</span>
          </div>

          <div className="grid grid-cols-3 gap-3 min-h-[120px]">
            {['Front', 'Middle', 'Rear'].map((section) => {
              const itemsInSection = cargoItems.filter(i => i.positionPosition === section);
              const sectionWeight = itemsInSection.reduce((a, b) => a + b.weightKg, 0);

              return (
                <div key={section} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-2 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-300">
                    <span>{section} Section</span>
                    <span className="font-mono text-indigo-300">{sectionWeight.toLocaleString()} kg</span>
                  </div>

                  <div className="space-y-1.5 overflow-y-auto max-h-[140px]">
                    {itemsInSection.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic block text-center py-4">Empty Zone</span>
                    ) : (
                      itemsInSection.map(item => (
                        <div key={item.id} className="p-2 bg-indigo-950/80 border border-indigo-700/60 rounded-lg text-xs space-y-0.5">
                          <div className="flex justify-between font-extrabold text-white text-[11px]">
                            <span className="truncate">{item.description}</span>
                            <span className="font-mono text-indigo-300 shrink-0 ml-1">{item.weightKg}kg</span>
                          </div>
                          <div className="flex gap-1.5">
                            {item.isFragile && <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 rounded">Fragile</span>}
                            {item.isHazardous && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">HAZMAT</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* INTERACTIVE CARGO CHART */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" /> Interactive Cargo Load & Axle Bias Distribution Chart
            </h4>
            <p className="text-[11px] text-slate-500">Weight (kg) vs Cubed Volume (m³) by Trailer Bay Zone</p>
          </div>
          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold rounded-full border border-indigo-200">
            CoG Rating: {cogOffsetPct >= 40 && cogOffsetPct <= 60 ? 'Optimal CoG Balance' : 'Axle Bias Alert'}
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bayZoneChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="zone" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
              <YAxis yAxisId="left" orientation="left" stroke="#4f46e5" tick={{ fontSize: 11 }} label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', fill: '#4f46e5', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 11 }} label={{ value: 'Volume (m³)', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar yAxisId="left" dataKey="weightKg" name="Cargo Weight (kg)" fill="#6366f1" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="volumeM3" name="Cargo Volume (m³)" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cargo Item Manifest Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Boxes className="w-4 h-4 text-indigo-600" /> Loaded Freight Manifest
          </h4>
          <span className="text-xs text-slate-500 font-bold">{cargoItems.length} Cargo Lots</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-extrabold text-[10px]">
                <th className="p-3">Cargo Lot Description</th>
                <th className="p-3 text-center">Weight</th>
                <th className="p-3 text-center">Volume</th>
                <th className="p-3 text-center">Trailer Placement Zone</th>
                <th className="p-3 text-center">Special Handling</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {cargoItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold text-slate-900">{item.description}</td>
                  <td className="p-3 text-center font-mono font-bold text-slate-800">{item.weightKg} kg</td>
                  <td className="p-3 text-center font-mono text-slate-600">{item.volumeM3} m³</td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      {item.positionPosition} Bay
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-1">
                      {item.isFragile && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-bold rounded">Fragile</span>}
                      {item.isHazardous && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">HAZMAT</span>}
                      {!item.isFragile && !item.isHazardous && <span className="text-[10px] text-slate-400">Standard</span>}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
