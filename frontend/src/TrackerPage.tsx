import { useEffect, useRef, useState } from 'react';
import { Navigation, Play, Square, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from './api';

const SEND_INTERVAL_MS = 7000;

interface LiveReading {
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  accuracy: number;
  capturedAt: number;
}

interface LogEntry {
  time: string;
  ok: boolean;
  message: string;
}

export default function TrackerPage() {
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem('tracker_device_id') || 'GPS-101');
  const [deviceToken, setDeviceToken] = useState(() => localStorage.getItem('tracker_device_token') || '');
  const [isTracking, setIsTracking] = useState(false);
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pingCount, setPingCount] = useState(0);

  const readingRef = useRef<LiveReading | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('tracker_device_id', deviceId);
  }, [deviceId]);

  useEffect(() => {
    localStorage.setItem('tracker_device_token', deviceToken);
  }, [deviceToken]);

  const pushLog = (entry: LogEntry) => {
    setLog((prev) => [entry, ...prev].slice(0, 8));
  };

  const sendCurrentPosition = async () => {
    const current = readingRef.current;
    if (!current) return;
    try {
      await api.positions.report(
        {
          device_id: deviceId,
          lat: current.lat,
          lng: current.lng,
          speed: current.speedKmh,
          heading: current.heading,
          timestamp: new Date(current.capturedAt).toISOString(),
        },
        deviceToken
      );
      setPingCount((c) => c + 1);
      pushLog({ time: new Date().toLocaleTimeString(), ok: true, message: `Sent (${current.lat.toFixed(5)}, ${current.lng.toFixed(5)})` });
    } catch (err) {
      pushLog({ time: new Date().toLocaleTimeString(), ok: false, message: err instanceof Error ? err.message : 'Failed to send' });
    }
  };

  const startTracking = () => {
    if (!('geolocation' in navigator)) {
      setGeoError('This browser does not support geolocation.');
      return;
    }
    setGeoError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: LiveReading = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speedKmh: pos.coords.speed ? Math.max(0, pos.coords.speed * 3.6) : 0,
          heading: pos.coords.heading ?? 0,
          accuracy: pos.coords.accuracy,
          capturedAt: pos.timestamp,
        };
        readingRef.current = next;
        setReading(next);
      },
      (err) => setGeoError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    intervalIdRef.current = window.setInterval(sendCurrentPosition, SEND_INTERVAL_MS);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalIdRef.current !== null) window.clearInterval(intervalIdRef.current);
    watchIdRef.current = null;
    intervalIdRef.current = null;
    setIsTracking(false);
  };

  useEffect(() => stopTracking, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-slate-950 text-white">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex items-center gap-3 justify-center">
          <div className="p-2.5 bg-blue-600 rounded-xl">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wider">FLEET TRACKER</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Phone GPS Device</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Device ID</label>
          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            disabled={isTracking}
            placeholder="e.g. GPS-101"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono font-bold disabled:opacity-50"
          />
          <p className="text-[10px] text-slate-500">
            Must match a device already registered under GPS Hardware Register in the dashboard (GPS-101 is
            pre-seeded and assigned to V-101).
          </p>

          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide pt-1">Device Token</label>
          <input
            type="password"
            value={deviceToken}
            onChange={(e) => setDeviceToken(e.target.value)}
            disabled={isTracking}
            placeholder="Paste the token shown once at registration"
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono disabled:opacity-50"
          />
          <p className="text-[10px] text-slate-500">
            Issued once when this device was registered (or its token last rotated) in GPS Hardware Register —
            required for the device to authenticate; positions won't be accepted without it.
          </p>
        </div>

        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition ${
            isTracking ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isTracking ? (
            <>
              <Square className="w-4 h-4" /> Stop Tracking
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Start Tracking
            </>
          )}
        </button>

        {geoError && (
          <div className="flex items-start gap-2 p-3 bg-rose-950 border border-rose-800 rounded-xl text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {geoError}
          </div>
        )}

        {reading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Latitude</span>
              <span className="font-mono font-bold">{reading.lat.toFixed(5)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Longitude</span>
              <span className="font-mono font-bold">{reading.lng.toFixed(5)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Speed</span>
              <span className="font-mono font-bold">{reading.speedKmh.toFixed(1)} km/h</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Accuracy</span>
              <span className="font-mono font-bold">±{Math.round(reading.accuracy)} m</span>
            </div>
          </div>
        )}

        {isTracking && (
          <p className="text-center text-[11px] text-slate-400">
            Sending a position every {SEND_INTERVAL_MS / 1000}s · {pingCount} sent
          </p>
        )}

        {log.length > 0 && (
          <div className="space-y-1.5">
            {log.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                {entry.ok ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                )}
                <span className="text-slate-600">{entry.time}</span>
                <span className="truncate">{entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
