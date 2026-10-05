import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fleettracker.app',
  appName: 'Fleet Tracker',
  webDir: 'dist',
  // One APK for both drivers and office staff — the home screen is app.html, a small
  // chooser (AppLauncherPage.tsx) with two options: Driver/Tracker (-> /track.html, no
  // login, drivers have no account in this system at all) and Admin Portal (-> /, the
  // normal site root, which already shows LoginScreen if not authenticated). Pointed at
  // the live deployment rather than bundling dist/ locally so everyone always gets the
  // current build with no APK rebuild/redistribution needed for ordinary web changes;
  // the app already needs network for the backend API regardless, so requiring it for
  // the shell too costs nothing extra.
  server: {
    url: 'https://frontend-drab-eight-64.vercel.app/app.html',
    cleartext: false,
  },
  // Background location tracking (see TrackerPage.tsx's use of
  // @capacitor-community/background-geolocation) needs two things on Android to keep
  // working past ~5 minutes in the background, straight from that plugin's own setup
  // notes: the legacy bridge (otherwise location updates silently stop after 5 minutes)
  // and native HTTP (otherwise the WebView's own networking gets throttled once
  // backgrounded, so position pings would stop reaching the backend even though the GPS
  // fix itself kept arriving).
  android: {
    useLegacyBridge: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
