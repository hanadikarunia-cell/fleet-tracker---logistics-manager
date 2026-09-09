import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BellRing, ShieldAlert, AlertTriangle, CheckCircle2,
  X, Zap, Activity, Radio, Volume2
} from 'lucide-react';

export interface AnimatedAlert {
  id: string;
  timestamp: string;
  type: 'critical' | 'warning' | 'info';
  vehicleName: string;
  message: string;
  metric?: string;
}

const INITIAL_LIVE_ALERTS: AnimatedAlert[] = [
  {
    id: 'alt_1',
    timestamp: 'Just Now',
    type: 'critical',
    vehicleName: 'Hauler Heavy #204',
    message: 'TPMS Rear Pressure Drop detected (1.8 Bar - Threshold 2.4 Bar)',
    metric: 'P: 1.8 Bar',
  },
  {
    id: 'alt_2',
    timestamp: '2 mins ago',
    type: 'warning',
    vehicleName: 'Cargo Flight Aircraft #901',
    message: 'Ground Auxiliary Battery Level low prior to engine spin-up',
    metric: 'SOC: 18%',
  },
  {
    id: 'alt_3',
    timestamp: '5 mins ago',
    type: 'info',
    vehicleName: 'Rapid Express Van #102',
    message: 'Custom Geofence Exit: Entered Port Klang Transit Terminal Zone',
    metric: 'Zone 4B',
  },
];

export default function LiveAnimatedAlertsBar() {
  const [alerts, setAlerts] = useState<AnimatedAlert[]>(INITIAL_LIVE_ALERTS);
  const [isMuted, setIsMuted] = useState(false);

  // Simulate incoming real-time telematics websocket alert stream
  useEffect(() => {
    const timer = setInterval(() => {
      const mockVehicles = ['Hauler Heavy #204', 'Rapid Express Van #102', 'Airport Cargo Tug #05', 'Express Shuttle #301'];
      const mockTypes: ('critical' | 'warning' | 'info')[] = ['warning', 'critical', 'info'];
      const randomVeh = mockVehicles[Math.floor(Math.random() * mockVehicles.length)];
      const randomType = mockTypes[Math.floor(Math.random() * mockTypes.length)];

      const randomMsg =
        randomType === 'critical'
          ? 'Hard Harsh Braking (-0.85g) detected at Junction B-12'
          : randomType === 'warning'
            ? 'Engine Coolant Temp spiked above 98°C during steep incline'
            : 'Scheduled Route Geofence arrived at Hub Alpha';

      const newAlert: AnimatedAlert = {
        id: `live_alt_${Date.now()}`,
        timestamp: 'Just now',
        type: randomType,
        vehicleName: randomVeh,
        message: randomMsg,
        metric: randomType === 'critical' ? '-0.85g' : randomType === 'warning' ? '98.5°C' : 'GPS Sync',
      };

      setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
    }, 18000); // add alert every 18s

    return () => clearInterval(timer);
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
          <Radio className="w-4 h-4 text-rose-600 animate-pulse" /> Live Telematics Stream Alerts ({alerts.length})
        </div>

        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
        >
          <Volume2 className={`w-3.5 h-3.5 ${isMuted ? 'text-slate-400' : 'text-emerald-600'}`} />
          {isMuted ? 'Audio Muted' : 'Audio Alerts Active'}
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`p-3.5 rounded-2xl border shadow-sm flex items-center justify-between gap-3 ${
                alert.type === 'critical'
                  ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                  : alert.type === 'warning'
                    ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                    : 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    alert.type === 'critical'
                      ? 'bg-rose-600 text-white shadow-xs animate-bounce'
                      : alert.type === 'warning'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-indigo-600 text-white shadow-xs'
                  }`}
                >
                  {alert.type === 'critical' ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : alert.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <BellRing className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900">{alert.vehicleName}</span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        alert.type === 'critical'
                          ? 'bg-rose-200 text-rose-800'
                          : alert.type === 'warning'
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-indigo-200 text-indigo-800'
                      }`}
                    >
                      {alert.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">{alert.timestamp}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">{alert.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {alert.metric && (
                  <span className="font-mono text-xs font-extrabold px-2.5 py-1 bg-white rounded-lg border border-slate-200/80 shadow-2xs text-slate-800">
                    {alert.metric}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.id)}
                  className="p-1 hover:bg-black/5 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
