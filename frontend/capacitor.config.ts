import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fleettracker.app',
  appName: 'Fleet Tracker',
  webDir: 'dist',
  // The app's home screen is the phone tracker, not the admin dashboard — drivers have no
  // login account in this system at all (only office staff do), so a login-walled dashboard
  // as the entry point would leave them stuck. Pointed at the live deployment rather than
  // bundling dist/ locally so drivers always get the current build with no separate APK
  // rebuild/redistribution needed for ordinary web changes; the app already needs network
  // for the backend API regardless, so requiring it for the shell too costs nothing extra.
  // A small in-page link lets anyone with an actual login (you, a manager) reach the full
  // dashboard from this same install — see TrackerPage.tsx.
  server: {
    url: 'https://frontend-drab-eight-64.vercel.app/track.html',
    cleartext: false,
  },
};

export default config;
