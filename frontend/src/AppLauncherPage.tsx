import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Navigation, ShieldCheck, ChevronRight, Download, X } from 'lucide-react';

// This is the Android app's actual home screen (server.url points here) — a single
// APK serving both audiences instead of two separate installs. Plain <a href> full-page
// navigation, not client-side routing: index.html, track.html, and this page are
// genuinely separate Vite entry points/bundles, same as the rest of this project's
// multi-page setup. "Admin Portal" just goes to the normal site root — if the visitor
// isn't logged in, the existing LoginScreen there already handles that; nothing about
// login state is decided here.

interface ApkVersionInfo {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  notes?: string;
}

export default function AppLauncherPage() {
  // Update check — native only. Everything served through app.html/track.html/index.html
  // already updates itself on every page load (it's just the live site); this is
  // specifically for the rare case where the native shell itself changed (a new
  // permission, a new plugin) and needs a fresh APK, which nothing here can hot-swap.
  // public/apk-version.json is a small file this project's maintainer updates by hand
  // each time a new APK is cut — compared against the installed app's own versionCode
  // (App.getInfo().build) so "is there something newer" never depends on parsing
  // version-name strings.
  const [updateInfo, setUpdateInfo] = useState<ApkVersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      try {
        const [info, res] = await Promise.all([CapacitorApp.getInfo(), fetch('/apk-version.json')]);
        if (!res.ok) return;
        const latest: ApkVersionInfo = await res.json();
        const installedBuild = Number(info.build);
        if (!cancelled && Number.isFinite(installedBuild) && latest.versionCode > installedBuild) {
          setUpdateInfo(latest);
        }
      } catch {
        // No connectivity, or the file's briefly unreachable — never block the chooser
        // screen over this, it's just a courtesy notice.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-slate-950 text-white">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3 justify-center">
          <div className="p-2.5 bg-blue-600 rounded-xl">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wider">FLEET TRACKER</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Choose how you're signing in</p>
          </div>
        </div>

        <a
          href="/track.html"
          className="flex items-center gap-4 bg-slate-900 border border-slate-800 hover:border-blue-700 rounded-2xl p-5 transition group"
        >
          <div className="p-3 bg-blue-600/15 text-blue-400 rounded-xl shrink-0">
            <Navigation className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-sm">Driver / Tracker</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Pair this phone and start sending its GPS position. No login needed.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 shrink-0" />
        </a>

        <a
          href="/"
          className="flex items-center gap-4 bg-slate-900 border border-slate-800 hover:border-emerald-700 rounded-2xl p-5 transition group"
        >
          <div className="p-3 bg-emerald-600/15 text-emerald-400 rounded-xl shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-sm">Admin Portal</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Fleet dashboard, hardware, and account management. Sign in with your admin login.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 shrink-0" />
        </a>
      </div>

      {/* UPDATE AVAILABLE POPUP — dismissible per visit, not permanently; it'll show again
          next launch until the APK is actually updated, same as how an app store badge
          would nag until you tap update. */}
      {updateInfo && !dismissed && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-600/15 text-blue-400 rounded-xl shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm">Update Available</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Version {updateInfo.versionName} is ready. This app's shell doesn't update itself the way its
                  content does — download it once to get the latest.
                </p>
              </div>
              <button onClick={() => setDismissed(true)} className="text-slate-500 hover:text-white shrink-0 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {updateInfo.notes && (
              <p className="text-[11px] text-slate-300 bg-slate-800/60 border border-slate-700 rounded-xl p-3">{updateInfo.notes}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setDismissed(true)}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-lg transition"
              >
                Later
              </button>
              <a
                href={updateInfo.downloadUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setDismissed(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" /> Download Update
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
