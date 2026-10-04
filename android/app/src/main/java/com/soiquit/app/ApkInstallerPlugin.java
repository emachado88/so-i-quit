package com.soiquit.app;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * In-app APK download + install for the update check (Android only).
 *
 * Two things the WebView cannot do on its own, so they live here:
 *  - `download`: streams the release APK into the app cache on a background
 *    thread. Doing it natively keeps a ~20 MB binary out of the bridge (no
 *    base64 round-trip) and sidesteps CORS — GitHub redirects release assets
 *    to a host that sends no CORS headers.
 *  - `install`: converts the cached file into a FileProvider content:// URI
 *    and fires ACTION_VIEW with the package-archive MIME type. The provider
 *    is already declared in AndroidManifest as ${applicationId}.fileprovider
 *    and res/xml/file_paths.xml exposes the cache dir, so no manifest
 *    provider changes are needed — only the REQUEST_INSTALL_PACKAGES
 *    permission (Android 8+ prompts "allow installs from this source").
 *
 * Registered in MainActivity.onCreate (app-local plugins are not
 * auto-discovered) and driven from app/utils/update-install.ts, whose JS
 * wrapper guards on the Android platform — web and iOS never reach this.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    /** GitHub asks for a User-Agent on asset downloads. */
    private static final String USER_AGENT = "SoIQuit-Updater";
    private static final int CONNECT_TIMEOUT_MS = 15000;
    private static final int READ_TIMEOUT_MS = 60000;
    private static final int BUFFER_SIZE = 8192;

    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        final String filename = call.getString("filename");
        if (url == null || url.isEmpty()) {
            call.reject("url must be provided");
            return;
        }
        final String name = (filename == null || filename.isEmpty())
                ? "update.apk"
                : filename;

        getBridge().execute(() -> {
            HttpURLConnection connection = null;
            try {
                final File target = new File(getContext().getCacheDir(), name);
                // Always start from a clean file — a half-written leftover
                // from a previous attempt would fail the installer.
                if (target.exists() && !target.delete()) {
                    call.reject("Could not replace the cached update file");
                    return;
                }

                connection = (HttpURLConnection) new URL(url).openConnection();
                // GitHub serves release assets through a redirect to a signed
                // URL on another host — follow it (default, set explicitly).
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", USER_AGENT);
                connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
                connection.setReadTimeout(READ_TIMEOUT_MS);

                final int status = connection.getResponseCode();
                if (status < 200 || status >= 400) {
                    call.reject("Download failed with HTTP " + status);
                    return;
                }

                try (
                        InputStream in = connection.getInputStream();
                        FileOutputStream out = new FileOutputStream(target)
                ) {
                    final byte[] buffer = new byte[BUFFER_SIZE];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                    }
                }

                final JSObject result = new JSObject();
                result.put("path", target.getAbsolutePath());
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Download failed", e);
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    @PluginMethod
    public void install(final PluginCall call) {
        final String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("path must be provided");
            return;
        }
        // Accept a file:// prefix too — the JS contract stays forgiving if a
        // caller ever passes through a @capacitor/filesystem URI.
        final String cleanPath = path.startsWith("file://")
                ? path.substring("file://".length())
                : path;
        final File apk = new File(cleanPath);
        if (!apk.exists()) {
            call.reject("APK not found: " + cleanPath);
            return;
        }

        getBridge().executeOnMainThread(() -> {
            try {
                final String authority = getContext().getPackageName() + ".fileprovider";
                final Uri uri = FileProvider.getUriForFile(getContext(), authority, apk);
                final Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(uri, "application/vnd.android.package-archive");
                intent.setFlags(
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                                | Intent.FLAG_ACTIVITY_NEW_TASK
                );
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject("Failed to open the installer", e);
            }
        });
    }
}
