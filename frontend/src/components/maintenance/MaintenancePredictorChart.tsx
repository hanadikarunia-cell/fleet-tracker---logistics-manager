import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { Brain, Sliders, AlertTriangle, ShieldCheck, Zap, Activity } from 'lucide-react';

interface ComponentCurvePoint {
  distanceKm: number;
  brakePadsHealthPct: number;
  tireTreadHealthPct: number;
  transmissionFluidPct: number;
  batterySohPct: number;
}

export default function MaintenancePredictorChart() {
  const [loadMultiplier, setLoadMultiplier] = useState<number>(1.2); // Payload factor
  const [brakingAggression, setBrakingAggression] = useState<number>(1.3); // Harsh braking factor
  selectedComponent: 'all';

  const [activeCurveFilter, setActiveCurveFilter] = useState<'all' | 'brakes' | 'tires' | 'fluid' | 'battery'>('all');

  // Compute remaining useful life (RUL) degradation curves based on distance & stress factors
  const chartData: ComponentCurvePoint[] = useMemo(() => {
    const data: ComponentCurvePoint[] = [];

    for (let km = 0; km <= 60000; km += 5000) {
      // Degradation decay functions
      const brakeLoss = (km / 45000) * 100 * brakingAggression * (loadMultiplier * 0.8);
      const tireLoss = (km / 55000) * 100 * (loadMultiplier * 0.9);
      const fluidLoss = (km / 75000) * 100 * (loadMultiplier * 0.7);
      const batteryLoss = (km / 90000) * 100;

      data.push({
        distanceKm: km,
        brakePadsHealthPct: Math.max(0, Math.round(100 - brakeLoss)),
        tireTreadHealthPct: Math.max(0, Math.round(100 - tireLoss)),
        transmissionFluidPct: Math.max(0, Math.round(100 - fluidLoss)),
        batterySohPct: Math.max(0, Math.round(100 - batteryLoss)),
      });
    }

    return data;
  }, [loadMultiplier, brakingAggression]);

  // Find projected failure point for Brake Pads (<20% health)
  const brakeCriticalKm = useMemo(() => {
    const pt = chartData.find(d => d.brakePadsHealthPct <= 20);
    return pt ? pt.distanceKm : 45000;
  }, [chartData]);

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            <h4 className="font-extrabold text-base text-slate-900">AI Component Degradation & RUL Predictor</h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Predictive Remaining Useful Life (RUL) decay curves modeled via CAN-Bus telematics & strain telemetry.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-extrabold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveCurveFilter('all')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeCurveFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            All Systems
          </button>
          <button
            type="button"
            onClick={() => setActiveCurveFilter('brakes')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeCurveFilter === 'brakes' ? 'bg-rose-500 text-white shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            Brake Pads
          </button>
          <button
            type="button"
            onClick={() => setActiveCurveFilter('tires')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeCurveFilter === 'tires' ? 'bg-amber-500 text-white shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            Tire Tread
          </button>
          <button
            type="button"
            onClick={() => setActiveCurveFilter('battery')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              activeCurveFilter === 'battery' ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            Battery SOH
          </button>
        </div>
      </div>

      {/* Stress Factor Sliders & Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Cargo Payload Load Stress:</span>
            <span className="font-mono text-indigo-600">{loadMultiplier.toFixed(1)}x Factor</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="2.0"
            step="0.1"
            value={loadMultiplier}
            onChange={(e) => setLoadMultiplier(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block">Simulates axle load & trailer gross weight strain.</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Braking & Throttle Aggression:</span>
            <span className="font-mono text-rose-600">{brakingAggression.toFixed(1)}x Factor</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="2.2"
            step="0.1"
            value={brakingAggression}
            onChange={(e) => setBrakingAggression(parseFloat(e.target.value))}
            className="w-full accent-rose-600 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block">Simulates driver harsh deceleration events per 100km.</span>
        </div>

        <div className="p-3 bg-indigo-900 text-white rounded-xl flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">Predicted Brake Limit</span>
            <span className="font-mono font-black text-sm text-amber-300">{brakeCriticalKm.toLocaleString()} km</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-indigo-200 block">Critical Servicing Window</span>
            <span className="font-mono font-bold text-xs text-emerald-400">Action @ 20% Health</span>
          </div>
        </div>
      </div>

      {/* Recharts Predictive Curves */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="distanceKm"
              tickFormatter={(v) => `${v / 1000}k km`}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <Tooltip
              formatter={(value: any, name: any) => [`${value}% SOH`, name]}
              labelFormatter={(label) => `Mileage: ${Number(label).toLocaleString()} km`}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
            <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Service Threshold (20%)', fill: '#ef4444', fontSize: 10, position: 'insideBottomRight' }} />

            {(activeCurveFilter === 'all' || activeCurveFilter === 'brakes') && (
              <Line
                type="monotone"
                dataKey="brakePadsHealthPct"
                name="Brake Pads Health"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            )}

            {(activeCurveFilter === 'all' || activeCurveFilter === 'tires') && (
              <Line
                type="monotone"
                dataKey="tireTreadHealthPct"
                name="Tire Tread Health"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            )}

            {(activeCurveFilter === 'all' || activeCurveFilter === 'fluid') && (
              <Line
                type="monotone"
                dataKey="transmissionFluidPct"
                name="Transmission Fluid"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            )}

            {(activeCurveFilter === 'all' || activeCurveFilter === 'battery') && (
              <Line
                type="monotone"
                dataKey="batterySohPct"
                name="Battery SOH"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
