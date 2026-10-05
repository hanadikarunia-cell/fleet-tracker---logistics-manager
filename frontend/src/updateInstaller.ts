import { registerPlugin } from '@capacitor/core';

// A plugin local to this project (android/app/src/main/java/com/fleettracker/app/
// UpdateInstaller.java) rather than an npm package — there's no definitions file to pull
// types from, so they're declared directly here instead. On the web this has no native
// counterpart; only ever called behind a Capacitor.isNativePlatform() check.
export interface UpdateInstallerPlugin {
  // Downloads the given APK URL with Android's own DownloadManager and, once it finishes,
  // hands it to the system installer. Resolves as soon as the download is QUEUED — actual
  // progress/outcome arrives via the 'updateStatus' event below, not this promise.
  downloadAndInstall(options: { url: string }): Promise<{ downloadId: number }>;
  // Resumes straight to the install step using the already-downloaded file — call this
  // after the user returns from the "allow installs from this app" settings screen the
  // 'needs_permission' status below sends them to.
  retryInstall(): Promise<void>;
  addListener(
    eventName: 'updateStatus',
    listenerFunc: (data: { phase: 'needs_permission' | 'installing' | 'error'; message?: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

export const UpdateInstaller = registerPlugin<UpdateInstallerPlugin>('UpdateInstaller');
