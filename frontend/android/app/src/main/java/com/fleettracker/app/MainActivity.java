package com.fleettracker.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // UpdateInstaller (see its own file) is a plugin local to this app, not an npm
    // package, so it isn't auto-discovered the way the Capacitor plugins in package.json
    // are — it has to be registered by hand, before super.onCreate().
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpdateInstaller.class);
        super.onCreate(savedInstanceState);
    }
}
