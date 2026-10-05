package com.fleettracker.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

// Downloads a new APK with Android's own DownloadManager — reliable background download,
// survives the app itself being backgrounded mid-download, and gives a standard system
// progress notification for free — and, once it's down, hands the file straight to the
// system package installer. That install step is the one tap Android itself requires for
// anything installed from outside the Play Store; nothing here (or anywhere) can script
// that away. See AppLauncherPage.tsx for the update-check UI that drives this.
@CapacitorPlugin(name = "UpdateInstaller")
public class UpdateInstaller extends Plugin {
    private static final String APK_FILENAME = "fleet-tracker-update.apk";

    private long enqueuedDownloadId = -1;
    private BroadcastReceiver downloadReceiver;

    @PluginMethod()
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("url is required.");
            return;
        }

        Context context = getContext();
        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) {
            call.reject("DownloadManager unavailable.");
            return;
        }

        File existing = apkFile(context);
        if (existing != null && existing.exists()) existing.delete();

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setTitle("Fleet Tracker update");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, APK_FILENAME);

        if (downloadReceiver != null) {
            try {
                context.unregisterReceiver(downloadReceiver);
            } catch (Exception ignore) {}
        }

        enqueuedDownloadId = manager.enqueue(request);

        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != enqueuedDownloadId) return;
                try {
                    ctx.unregisterReceiver(this);
                } catch (Exception ignore) {}
                downloadReceiver = null;
                handleDownloadComplete(manager, id);
            }
        };
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_NOT_EXPORTED);
        } else {
            context.registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        }

        JSObject data = new JSObject();
        data.put("downloadId", enqueuedDownloadId);
        call.resolve(data);
    }

    private void handleDownloadComplete(DownloadManager manager, long id) {
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
        try (Cursor cursor = manager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) {
                notifyListeners("updateStatus", errorStatus("Download didn't complete."));
                return;
            }
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            if (status != DownloadManager.STATUS_SUCCESSFUL) {
                int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
                notifyListeners("updateStatus", errorStatus("Download failed (code " + reason + "). Check your connection and try again."));
                return;
            }
        }
        proceedToInstall();
    }

    private void proceedToInstall() {
        Context context = getContext();
        File apk = apkFile(context);
        if (apk == null || !apk.exists()) {
            notifyListeners("updateStatus", errorStatus("Couldn't find the downloaded update."));
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.getPackageManager().canRequestPackageInstalls()) {
            // Android requires this be granted per-app, in its own Settings screen — not a
            // plain runtime permission dialog. The app can prompt the user TO that screen,
            // but can't itself grant it; retryInstall() below resumes once they come back.
            notifyListeners("updateStatus", statusWith("needs_permission", null));
            Intent settingsIntent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + context.getPackageName())
            );
            settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                context.startActivity(settingsIntent);
            } catch (Exception ignore) {}
            return;
        }

        installApk(apk);
    }

    private void installApk(File apk) {
        Context context = getContext();
        Uri apkUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apk);
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(installIntent);
            notifyListeners("updateStatus", statusWith("installing", null));
        } catch (Exception e) {
            notifyListeners("updateStatus", errorStatus("Could not open the installer: " + e.getMessage()));
        }
    }

    // Called from JS when the app resumes after the user visits the "allow installs from
    // this app" settings screen — resumes straight to the install step, the download
    // itself doesn't need repeating.
    @PluginMethod()
    public void retryInstall(PluginCall call) {
        File apk = apkFile(getContext());
        if (apk == null || !apk.exists()) {
            call.reject("No downloaded update found. Start the download again.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            call.reject("Install permission still not granted.", "NOT_AUTHORIZED");
            return;
        }
        installApk(apk);
        call.resolve();
    }

    private File apkFile(Context context) {
        File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        return dir == null ? null : new File(dir, APK_FILENAME);
    }

    private JSObject statusWith(String phase, String message) {
        JSObject data = new JSObject();
        data.put("phase", phase);
        if (message != null) data.put("message", message);
        return data;
    }

    private JSObject errorStatus(String message) {
        return statusWith("error", message);
    }
}
