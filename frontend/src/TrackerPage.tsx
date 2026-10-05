import { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Navigation, Play, Square, AlertTriangle, CheckCircle2, QrCode, Settings, ScanLine } from 'lucide-react';
import { api, ApiError, API_URL } from './api';

const SEND_INTERVAL_MS = 7000;

// On the web (testing in a browser) this plugin has no native counterpart and every call
// rejects — only ever invoked behind an isNative check below, never on the web fallback
// path. See capacitor.config.ts for the Android setup (useLegacyBridge, native HTTP) this
// plugin needs to keep working past 5 minutes in the background.
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

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

const isNative = Capacitor.isNativePlatform();

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

  const [isScanning, setIsScanning] = useState(false);

  const readingRef = useRef<LiveReading | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const bgWatcherIdRef = useRef<string | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const uploadListenerRef = useRef<{ remove: () => Promise<void> } | null>(null);

  // Gets the one-time Google Play Services scanner module ready ahead of time, so the
  // first tap of "Scan QR Code" doesn't stall on a download. Best-effort — scan() would
  // still prompt for it itself if this hasn't finished yet.
  useEffect(() => {
    if (!isNative) return;
    BarcodeScanner.installGoogleBarcodeScannerModule().catch(() => {});
  }, []);

  // Since the native background watcher now deliberately outlives this page (see the
  // unmount effect below), navigating away and back — e.g. to the Admin Portal and back —
  // must not call addWatcher a second time on top of the one still running; that would
  // register a redundant watcher on the same service. The watcher id is persisted purely
  // so "Stop Tracking" still works after a remount, by addressing the SAME watcher rather
  // than one this fresh component instance never created.
  useEffect(() => {
    if (!isNative) return;
    const savedId = localStorage.getItem('tracker_bg_watcher_id');
    if (savedId) {
      bgWatcherIdRef.current = savedId;
      setIsTracking(true);
    }
  }, []);

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

  // In-app scan: the QR encodes a link (…/track.html?deviceId=X&pair=CODE) — same format
  // the deep-link path below handles, just read directly from the camera instead of
  // requiring the phone's separate Camera app + a tap-through. Native only; scan() has no
  // web implementation.
  const handleScanQr = async () => {
    if (isPairing || isScanning) return;
    setPairError(null);
    setIsScanning(true);
    try {
      const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
      const raw = barcodes[0]?.displayValue || barcodes[0]?.rawValue;
      if (!raw) {
        setPairError('No code detected. Try again, or enter it manually below.');
        return;
      }
      let qrDeviceId: string | null = null;
      let qrCode: string | null = null;
      try {
        const url = new URL(raw);
        qrDeviceId = url.searchParams.get('deviceId');
        qrCode = url.searchParams.get('pair');
      } catch {
        // Not a URL at all — falls through to the "doesn't look like" message below.
      }
      if (!qrDeviceId || !qrCode) {
        setPairError("That code doesn't look like a Fleet Tracker pairing QR. Enter it manually below instead.");
        return;
      }
      await pairDevice(qrDeviceId, qrCode);
    } catch (err) {
      // Includes the user backing out of the scanner — not worth surfacing as an error.
      const message = err instanceof Error ? err.message : '';
      if (!/cancel/i.test(message)) {
        setPairError(message || 'Could not open the scanner.');
      }
    } finally {
      setIsScanning(false);
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
    setGeoError(null);

    if (isNative) {
      // Android 13+ needs this for the foreground service's "tracking active"
      // notification to actually show. Best-effort: if it's denied the service still
      // runs and location still reports, the notification just might not appear.
      LocalNotifications.requestPermissions().catch(() => {});

      // Hands the native side what it needs to upload positions on its own — required so
      // tracking keeps reporting even after the app is swiped away and this JS stops
      // running entirely, not just backgrounded. See BackgroundGeolocationService's class
      // comment (patched — frontend/patches/) for how this is used on the native side.
      BackgroundGeolocation.configureUpload({ apiUrl: API_URL, deviceId, deviceToken }).catch((err) => {
        pushLog({ time: new Date().toLocaleTimeString(), ok: false, message: err instanceof Error ? err.message : 'Failed to configure background upload' });
      });

      // Reports the result of each native upload (the actual POST now happens in Java, not
      // here — see the patch above) purely so the UI's ping count / log stay accurate.
      BackgroundGeolocation.addListener('uploadResult', ({ success, message }) => {
        if (success) setPingCount((c) => c + 1);
        pushLog({ time: new Date().toLocaleTimeString(), ok: success, message });
      }).then((handle) => {
        uploadListenerRef.current = handle;
      });

      // Giving backgroundMessage/backgroundTitle is what makes this plugin keep
      // delivering fixes with the screen off or the app closed — without them it
      // behaves like plain foreground-only geolocation. The ongoing notification it
      // puts up is required by Android for a location foreground service; it isn't
      // an error.
      BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: 'Fleet Tracker is active',
          backgroundMessage: 'Sending this phone’s location. Tap Stop Tracking in the app to end this.',
          requestPermissions: true,
          stale: false,
        },
        (location, error) => {
          if (error) {
            setGeoError(
              error.code === 'NOT_AUTHORIZED'
                ? 'Location permission wasn’t granted. Open Settings and allow location — choose "Allow all the time" so tracking keeps working with the screen off.'
                : error.message
            );
            return;
          }
          if (!location) return;
          // Display only — the actual upload to the backend happens natively now (see
          // above), so this callback never calls sendCurrentPosition itself. That avoids
          // double-posting: one upload path, native, regardless of whether the app is
          // open, backgrounded, or fully closed.
          const next: LiveReading = {
            lat: location.latitude,
            lng: location.longitude,
            speedKmh: location.speed ? Math.max(0, location.speed * 3.6) : 0,
            heading: location.bearing ?? 0,
            accuracy: location.accuracy,
            capturedAt: location.time ?? Date.now(),
          };
          readingRef.current = next;
          setReading(next);
        }
      )
        .then((id) => {
          bgWatcherIdRef.current = id;
          localStorage.setItem('tracker_bg_watcher_id', id);
        })
        .catch((err) => {
          setGeoError(err instanceof Error ? err.message : 'Failed to start background location tracking.');
        });

      setIsTracking(true);
      return;
    } else {
      if (!('geolocation' in navigator)) {
        setGeoError('This browser does not support geolocation.');
        return;
      }
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
    }

    intervalIdRef.current = window.setInterval(sendCurrentPosition, SEND_INTERVAL_MS);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (bgWatcherIdRef.current !== null) {
      BackgroundGeolocation.removeWatcher({ id: bgWatcherIdRef.current }).catch(() => {});
      localStorage.removeItem('tracker_bg_watcher_id');
    }
    if (uploadListenerRef.current !== null) {
      uploadListenerRef.current.remove().catch(() => {});
    }
    if (intervalIdRef.current !== null) window.clearInterval(intervalIdRef.current);
    watchIdRef.current = null;
    bgWatcherIdRef.current = null;
    uploadListenerRef.current = null;
    intervalIdRef.current = null;
    setIsTracking(false);
  };

  // Web fallback only — a watchPosition + interval genuinely leaks if this component
  // unmounts without cleanup. The native background watcher is deliberately NOT stopped
  // here: it's supposed to keep running independent of this page's lifecycle (navigating
  // elsewhere in the app, or the app being swiped away entirely), so it only stops when
  // the user actually taps Stop Tracking.
  useEffect(() => {
    return () => {
      if (!isNative) stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

            {isNative ? (
              <>
                <button
                  onClick={handleScanQr}
                  disabled={isScanning || isPairing}
                  className="w-full py-3 rounded-xl font-extrabold text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none transition flex items-center justify-center gap-2"
                >
                  <ScanLine className="w-4 h-4" /> {isScanning ? 'Scanning…' : 'Scan QR Code'}
                </button>
                <p className="text-[10px] text-slate-500 text-center">Or enter the device ID and pairing code shown underneath it manually below.</p>
              </>
            ) : (
              <p className="text-[10px] text-slate-500">Open this page in the Fleet Tracker app to scan the code with the camera, or enter the device ID and the short pairing code shown underneath it below.</p>
            )}

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
          <div className="flex flex-col gap-2 p-3 bg-rose-950 border border-rose-800 rounded-xl text-xs text-rose-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {geoError}
            </div>
            {isNative && (
              <button
                onClick={() => BackgroundGeolocation.openSettings()}
                className="flex items-center gap-1.5 self-start text-[10px] font-bold text-rose-200 hover:text-white underline underline-offset-2 cursor-pointer"
              >
                <Settings className="w-3 h-3" /> Open Location Settings
              </button>
            )}
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
          <div className="text-center space-y-1">
            <p className="text-[11px] text-slate-400">
              Sending a position every {SEND_INTERVAL_MS / 1000}s · {pingCount} sent
            </p>
            {isNative && (
              <p className="text-[10px] text-slate-500">
                Keeps running with the screen off — you'll see a "Fleet Tracker is active" notification while
                it's on. That's expected, not an error.
              </p>
            )}
          </div>
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

        {/* Back to the app's chooser screen (app.html) — plain navigation, not a route,
            since index.html/track.html/app.html are genuinely separate pages. The phone's
            own back button already gets here too (ordinary WebView history), this is just
            an explicit, visible way to do the same thing. */}
        <p className="text-center pt-2">
          <a href="/app.html" className="text-[10px] text-slate-600 hover:text-slate-400 underline underline-offset-2">
            ← Switch
          </a>
        </p>
      </div>
    </div>
  );
}
