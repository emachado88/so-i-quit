package com.soiquit.app;

import android.graphics.Color;
import android.os.Build;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps the Android system bars (status + navigation) in sync with the
 * app's in-app theme (color-mode), which the OS cannot see — it only knows
 * the system uiMode. Without this, a dark page over a light-mode OS keeps
 * dark nav-bar icons and the system's light contrast scrim: a light-grey
 * band behind the gesture pill / 3-button keys (and dark status icons on
 * the dark background).
 *
 * Two independent levers:
 *  - Icon appearance: `setAppearanceLightStatusBars/NavigationBars`
 *    flips the icon color (light-mode icons <-> dark-mode icons).
 *  - Nav-bar contrast scrim: with targetSdk 36 edge-to-edge is enforced,
 *    and on Xiaomi/HyperOS the system paints a fixed light-grey band over
 *    the nav-bar area that does NOT follow the icon appearance (verified
 *    on Android 16: white icons + light band). `setNavigationBarContrast
 *    Enforced(false)` kills it so the app's own background shows through.
 *  - Below Android 15 the solid bar colors still apply, so those are
 *    painted to match the app surfaces as well.
 *
 * Called from app/plugins/system-bars.client.ts whenever the resolved
 * color-mode changes. Browser/web builds never reach this (no plugin
 * registered there — the JS wrapper guards on the platform).
 */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {

    /** App light background (main.css --color-bg). */
    private static final int BG_LIGHT = Color.rgb(0xF7, 0xF6, 0xF3);
    /** App dark background (main.css html.dark --color-bg). */
    private static final int BG_DARK = Color.rgb(0x0F, 0x0E, 0x0D);

    @PluginMethod
    public void setTheme(final PluginCall call) {
        final Boolean dark = call.getBoolean("dark");
        if (dark == null) {
            call.reject("dark must be provided");
            return;
        }
        getBridge().executeOnMainThread(() -> {
            final Window window = getActivity().getWindow();
            final WindowInsetsControllerCompat controller =
                    WindowCompat.getInsetsController(window, window.getDecorView());
            // Dark mode -> light icons; light mode -> dark icons (both bars).
            controller.setAppearanceLightStatusBars(!dark);
            controller.setAppearanceLightNavigationBars(!dark);
            // Android 15+ edge-to-edge: kill the system nav-bar contrast
            // scrim — on Xiaomi/HyperOS it paints a light-grey band behind
            // the 3-button keys over the dark page regardless of the icon
            // appearance (and of theme, theme-color, color-scheme). Without
            // this the page's own dark background can't show through.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.setNavigationBarContrastEnforced(false);
            }
            // Pre-Android-15 solid bars (no-op on 15+ — edge-to-edge enforced).
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                window.setStatusBarColor(dark ? BG_DARK : BG_LIGHT);
                window.setNavigationBarColor(dark ? BG_DARK : BG_LIGHT);
            }
            call.resolve();
        });
    }
}
