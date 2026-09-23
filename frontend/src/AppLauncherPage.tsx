import { Navigation, ShieldCheck, ChevronRight } from 'lucide-react';

// This is the Android app's actual home screen (server.url points here) — a single
// APK serving both audiences instead of two separate installs. Plain <a href> full-page
// navigation, not client-side routing: index.html, track.html, and this page are
// genuinely separate Vite entry points/bundles, same as the rest of this project's
// multi-page setup. "Admin Portal" just goes to the normal site root — if the visitor
// isn't logged in, the existing LoginScreen there already handles that; nothing about
// login state is decided here.
export default function AppLauncherPage() {
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
    </div>
  );
}
