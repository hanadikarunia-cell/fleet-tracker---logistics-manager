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
};

export default config;
