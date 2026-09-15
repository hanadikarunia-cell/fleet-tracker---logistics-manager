import { useEffect, useRef, useState } from 'react';
import { Navigation, Play, Square, AlertTriangle, CheckCircle2, QrCode } from 'lucide-react';
import { api, ApiError } from './api';

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
  // Set only when a previously-working credential is rejected (401) — distinguishes
  // "never paired yet" from "was paired, but the credential is now dead" so the
  // message can be specific instead of just looping silent 401s forever.
  const [needsRepair, setNeedsRepair] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);

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

  const pairDevice = async (id: string, code: string) => {
    setIsPairing(true);
    setPairError(null);
    try {
      const { token } = await api.devices.pair(id, code);
      setDeviceId(id);
      setDeviceToken(token);
      setNeedsRepair(false);
      setPairingCode('');
    } catch (err) {
      setPairError(err instanceof Error ? err.message : 'Pairing failed');
    } finally {
      setIsPairing(false);
    }
  };

  // QR path: the code encodes a link (…/track.html?deviceId=X&pair=CODE), so scanning
  // it with the phone's own camera app opens this page and pairing happens
  // automatically — no manual typing needed. The query string is stripped
  // immediately after so a page refresh doesn't retry an already-consumed code.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrDeviceId = params.get('deviceId');
    const qrCode = params.get('pair');
    if (qrDeviceId && qrCode) {
      window.history.replaceState({}, '', window.location.pathname);
      pairDevice(qrDeviceId, qrCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (err instanceof ApiError && err.status === 401) {
        // The stored credential is no longer valid (revoked, or the device was
        // re-paired elsewhere). Stop instead of hammering the endpoint forever, clear
        // the dead credential, and require an explicit fresh pairing.
        stopTracking();
        setDeviceToken('');
        setNeedsRepair(true);
        pushLog({ time: new Date().toLocaleTimeString(), ok: false, message: 'Device pairing expired or revoked' });
        return;
      }
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

  const forgetDevice = () => {
    stopTracking();
    setDeviceToken('');
    setNeedsRepair(false);
    setPairError(null);
  };

  const isPaired = !!deviceToken && !needsRepair;

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

        {isPaired ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Device</label>
            <p className="text-sm font-mono font-bold">{deviceId}</p>
            <div className="flex items-center gap-1.5 pt-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wide">Status: Paired</span>
            </div>
            <button
              onClick={forgetDevice}
              disabled={isTracking}
              className="text-[10px] text-slate-500 hover:text-rose-400 underline underline-offset-2 pt-1 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Forget this device
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            {needsRepair && (
              <div className="flex items-start gap-2 p-3 bg-amber-950 border border-amber-800 rounded-xl text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Device pairing expired or revoked. Ask an admin for a new pairing code from GPS Hardware Register.
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-300">
              <QrCode className="w-4 h-4" />
              <span className="text-[11px] font-bold">Scan the QR code shown in GPS Hardware Register to pair automatically.</span>
            </div>
            <p className="text-[10px] text-slate-500">Can't scan? Enter the device ID and the short pairing code shown underneath it instead.</p>

            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide pt-1">Device ID</label>
            <input
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              disabled={isPairing}
              placeholder="e.g. GPS-101"
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono font-bold disabled:opacity-50"
            />

            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide pt-1">Pairing Code</label>
            <input
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              disabled={isPairing}
              placeholder="e.g. AB3C-9XYZ"
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-mono disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-500">
              Generated from GPS Hardware Register, valid for 10 minutes, and usable once. This is not the device
              token — it only authorizes this one pairing.
            </p>

            {pairError && (
              <div className="flex items-start gap-2 p-3 bg-rose-950 border border-rose-800 rounded-xl text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {pairError}
              </div>
            )}

            <button
              onClick={() => pairDevice(deviceId, pairingCode)}
              disabled={isPairing || !deviceId || !pairingCode}
              className="w-full py-3 rounded-xl font-extrabold text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none transition"
            >
              {isPairing ? 'Pairing…' : 'Pair Device'}
            </button>
          </div>
        )}

        <button
          onClick={isTracking ? stopTracking : startTracking}
          disabled={!isPaired}
          className={`w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:pointer-events-none ${
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
