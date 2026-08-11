package com.soiquit.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

/**
 * OEM-proof launch splash. HyperOS/MIUI skip or darken the Android 12+
 * system splash, so this activity draws the branded splash drawable
 * full-screen for {@link #SPLASH_MS}, then hands off to MainActivity —
 * forwarding the launch intent (action + extras) so notification cold-start
 * taps still reach the WebView listener in app.vue.
 */
public class SplashActivity extends Activity {

    /** Minimum visible time for the branded splash. */
    private static final long SPLASH_MS = 1200;

    private final Handler handler = new Handler(Looper.getMainLooper());

    private final Runnable openMain = new Runnable() {
        @Override
        public void run() {
            Intent intent = new Intent(SplashActivity.this, MainActivity.class);
            Intent launch = getIntent();
            if (launch != null) {
                intent.setAction(launch.getAction());
                intent.setData(launch.getData());
                if (launch.getExtras() != null) {
                    intent.putExtras(launch.getExtras());
                }
            }
            // Crossfade (not the default slide). On API 34+ the animations are
            // captured at launch time, so overrideActivityTransition must run
            // BEFORE startActivity; the legacy call must run right AFTER it.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                applyFadeTransition();
                startActivity(intent);
                finish();
            } else {
                startActivity(intent);
                overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
                finish();
                overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
            }
        }
    };

    /**
     * Crossfade from the splash into the WebView window instead of the
     * default slide/zoom. API 34+ uses {@code overrideActivityTransition}
     * (the legacy {@code overridePendingTransition} is deprecated there);
     * older versions use the classic call. Called right after
     * {@code startActivity} and again after {@code finish} so both the open
     * and the close side of the transition fade.
     */
    private void applyFadeTransition() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            overrideActivityTransition(
                    OVERRIDE_TRANSITION_OPEN, android.R.anim.fade_in, android.R.anim.fade_out);
            overrideActivityTransition(
                    OVERRIDE_TRANSITION_CLOSE, android.R.anim.fade_in, android.R.anim.fade_out);
        } else {
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handler.postDelayed(openMain, SPLASH_MS);
    }

    @Override
    public void onBackPressed() {
        // Back during the splash exits the app instead of launching MainActivity.
        finish();
        moveTaskToBack(true);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(openMain);
        super.onDestroy();
    }
}
