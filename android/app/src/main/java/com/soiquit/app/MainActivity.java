package com.soiquit.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugin — registered explicitly (auto-discovery only
        // covers node_modules plugins via capacitor.plugins.json).
        registerPlugin(SystemBarsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
