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

    public class NativeAudioBridge {
        @JavascriptInterface
        public void updateMediaSession(
            boolean playing,
            String title,
            String artist,
            String album,
            String artworkUrl,
            double positionSeconds,
            double durationSeconds
        ) {
            AudioKeepAliveService.isPlaybackActive = playing;
            AudioKeepAliveService.isSessionActive = true;
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(MainActivity.this, AudioKeepAliveService.class);
                    intent.setAction(AudioKeepAliveService.ACTION_UPDATE_MEDIA);
                    intent.putExtra(AudioKeepAliveService.EXTRA_PLAYING, playing);
                    intent.putExtra(AudioKeepAliveService.EXTRA_TITLE, title != null ? title : "IVE: Dive Archive");
                    intent.putExtra(AudioKeepAliveService.EXTRA_ARTIST, artist != null ? artist : "IVE");
                    intent.putExtra(AudioKeepAliveService.EXTRA_ALBUM, album != null ? album : "Dive Archive");
                    intent.putExtra(AudioKeepAliveService.EXTRA_ARTWORK_URL, artworkUrl != null ? artworkUrl : "");
                    intent.putExtra(AudioKeepAliveService.EXTRA_POSITION_MS, Math.max(0L, Math.round(positionSeconds * 1000.0)));
                    intent.putExtra(AudioKeepAliveService.EXTRA_DURATION_MS, Math.max(1000L, Math.round(durationSeconds * 1000.0)));

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        ContextCompat.startForegroundService(MainActivity.this, intent);
                    } else {
                        startService(intent);
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void stopMediaSession() {
            AudioKeepAliveService.isPlaybackActive = false;
            AudioKeepAliveService.isSessionActive = false;
            runOnUiThread(() -> {
                try {
                    Intent stopIntent = new Intent(MainActivity.this, AudioKeepAliveService.class);
                    stopIntent.setAction(AudioKeepAliveService.ACTION_STOP_SERVICE);
                    startService(stopIntent);
                } catch (Exception ignored) {}
            });
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

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

        // Route hardware / notification / lockscreen / Dynamic Island media buttons back into React player.tsx
        AudioKeepAliveService.setMediaCommandListener((command, seekSeconds) -> {
            runOnUiThread(() -> {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    String js = "window.__iveNativeMediaCommand && window.__iveNativeMediaCommand('"
                        + command + "', " + seekSeconds + ");";
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            });
        });

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);

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
            webView.onResume();
            webView.resumeTimers();
            if (AudioKeepAliveService.isSessionActive) {
                webView.postDelayed(() -> {
                    webView.onResume();
                    webView.resumeTimers();
                }, 100);
                webView.postDelayed(() -> {
                    webView.onResume();
                    webView.resumeTimers();
                }, 400);
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
        AudioKeepAliveService.setMediaCommandListener(null);
        try {
            Intent stopIntent = new Intent(this, AudioKeepAliveService.class);
            stopIntent.setAction(AudioKeepAliveService.ACTION_STOP_SERVICE);
            startService(stopIntent);
        } catch (Exception ignored) {}
        super.onDestroy();
    }
}
