package com.ive.divearchive;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private volatile boolean isMusicPlaying = false;

    public class NativeAudioBridge {
        @JavascriptInterface
        public void setPlaybackState(boolean playing, String title, String artist) {
            isMusicPlaying = playing;
            runOnUiThread(() -> {
                try {
                    Intent serviceIntent = new Intent(MainActivity.this, AudioKeepAliveService.class);
                    if (playing) {
                        serviceIntent.setAction(AudioKeepAliveService.ACTION_START_OR_UPDATE);
                        serviceIntent.putExtra(AudioKeepAliveService.EXTRA_TITLE, title != null ? title : "IVE: Dive Archive");
                        serviceIntent.putExtra(AudioKeepAliveService.EXTRA_ARTIST, artist != null ? artist : "IVE");
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            ContextCompat.startForegroundService(MainActivity.this, serviceIntent);
                        } else {
                            startService(serviceIntent);
                        }
                    } else {
                        serviceIntent.setAction(AudioKeepAliveService.ACTION_STOP);
                        startService(serviceIntent);
                    }
                } catch (Exception ignored) {
                    // Ignore if OS blocks background service transition
                }
            });
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Request notification permission on Android 13+ so the Now Playing media service notification displays cleanly
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[] { Manifest.permission.POST_NOTIFICATIONS },
                    1001
                );
            }
        }

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            // Allow instant audio playback without gesture-gate lag
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Expose native foreground audio service controller to player.tsx
            webView.addJavascriptInterface(new NativeAudioBridge(), "IveNativeAudio");

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getWindow().getDecorView().setImportantForAutofill(
                    View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
                );
                webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            }
        }
    }

    private void keepWebViewAudioAwake() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            // Capacitor's BridgeActivity pauses the WebView in super.onPause();
            // immediately resume WebView & JS timers + dispatch visibility override so YouTube & <audio> never stop!
            webView.onResume();
            webView.resumeTimers();
            if (isMusicPlaying) {
                webView.postDelayed(() -> {
                    webView.onResume();
                    webView.resumeTimers();
                }, 120);
                webView.postDelayed(() -> {
                    webView.onResume();
                    webView.resumeTimers();
                }, 450);
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        keepWebViewAudioAwake();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepWebViewAudioAwake();
    }

    @Override
    public void onDestroy() {
        try {
            Intent stopIntent = new Intent(this, AudioKeepAliveService.class);
            stopIntent.setAction(AudioKeepAliveService.ACTION_STOP);
            startService(stopIntent);
        } catch (Exception ignored) {}
        super.onDestroy();
    }
}
