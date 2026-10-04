package com.soiquit.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins — registered explicitly (auto-discovery only
        // covers node_modules plugins via capacitor.plugins.json).
        registerPlugin(SystemBarsPlugin.class);
        registerPlugin(ApkInstallerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
