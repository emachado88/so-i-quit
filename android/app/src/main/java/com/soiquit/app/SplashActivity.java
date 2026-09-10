package com.soiquit.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewTreeObserver;

/**
 * OEM-proof launch splash. HyperOS/MIUI skip (or darken) the Android 12+
 * system splash, so this activity exists to hold the branded launch art
 * (`AppTheme.NoActionBarLaunch` → `@drawable/splash_screen`: gradient + logo)
 * from the moment the process is up, then hands off to MainActivity on the
 * first drawn frame — no fixed hold. Because the same art is the window
 * background of both activities, the logo is on screen from the very first
 * frame and never blinks across the hand-off. The WebView is opaque and
 * simply replaces the art as soon as its window draws — no fade (a WebView
 * alpha cross-fade was tried and reverted: it never showed on device and one
 * launch came up with no art at all).
 *
 * The launch intent (action + extras) is forwarded to MainActivity so
 * notification cold-start taps still reach the WebView listener in app.vue.
 */
public class SplashActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Hand off right after the branded window has been drawn once: the
        // first pre-draw of this activity's window. Posting from onPreDraw
        // keeps the traversal clean and guarantees one painted frame.
        final View decor = getWindow().getDecorView();
        decor.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override
            public boolean onPreDraw() {
                decor.getViewTreeObserver().removeOnPreDrawListener(this);
                decor.post(SplashActivity.this::openMain);
                return true;
            }
        });
    }

    private void openMain() {
        Intent intent = new Intent(this, MainActivity.class);
        Intent launch = getIntent();
        if (launch != null) {
            intent.setAction(launch.getAction());
            intent.setData(launch.getData());
            if (launch.getExtras() != null) {
                intent.putExtras(launch.getExtras());
            }
        }
        // No activity transition: both windows show the same backdrop, so the
        // default slide/zoom would only read as a jump. The launch theme sets
        // android:windowAnimationStyle=@null; the explicit override covers
        // builds/ROMs that ignore it (0 = no animation). On API 34+ the
        // transitions are captured at launch time, so the override has to run
        // BEFORE startActivity.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            overrideActivityTransition(OVERRIDE_TRANSITION_OPEN, 0, 0);
            overrideActivityTransition(OVERRIDE_TRANSITION_CLOSE, 0, 0);
            startActivity(intent);
            finish();
        }
        else {
            startActivity(intent);
            overridePendingTransition(0, 0);
            finish();
        }
    }

    @Override
    public void onBackPressed() {
        // Back while the splash is up exits the app instead of launching
        // MainActivity (noHistory keeps it off the back stack).
        finish();
        moveTaskToBack(true);
    }
}
