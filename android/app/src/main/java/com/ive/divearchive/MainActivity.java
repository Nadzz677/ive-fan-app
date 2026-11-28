package com.ive.divearchive;

import android.Manifest;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
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

    private static String sanitizeText(String raw, String fallback, int maxLen) {
        if (raw == null) return fallback;
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) return fallback;
        return trimmed.length() > maxLen ? trimmed.substring(0, maxLen) : trimmed;
    }

    private static String sanitizeHttpsArtworkUrl(String raw) {
        if (raw == null) return "";
        String trimmed = raw.trim();
        if (trimmed.length() > 2048) return "";
        if (!trimmed.regionMatches(true, 0, "https://", 0, 8)) return "";
        return trimmed;
    }

    private static boolean isAllowedMediaCommand(String command) {
        if (command == null) return false;
        switch (command) {
            case "play":
            case "pause":
            case "toggle":
            case "next":
            case "prev":
            case "seek":
                return true;
            default:
                return false;
        }
    }

    private boolean isTrustedLocalWebViewOrigin() {
        if (getBridge() == null || getBridge().getWebView() == null) return false;
        String currentUrl = getBridge().getWebView().getUrl();
        if (currentUrl == null) return false;
        try {
            Uri uri = Uri.parse(currentUrl);
            if (!"https".equalsIgnoreCase(uri.getScheme())) return false;
            String host = uri.getHost();
            return "ive-dive-archive.web.app".equalsIgnoreCase(host)
                || "localhost".equalsIgnoreCase(host);
        } catch (Exception ignored) {
            return false;
        }
    }

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
            final String safeTitle = sanitizeText(title, "IVE: Dive Archive", 160);
            final String safeArtist = sanitizeText(artist, "IVE", 120);
            final String safeAlbum = sanitizeText(album, "Dive Archive", 160);
            final String safeArtwork = sanitizeHttpsArtworkUrl(artworkUrl);
            final long safePosMs = Double.isFinite(positionSeconds)
                ? Math.max(0L, Math.round(positionSeconds * 1000.0))
                : 0L;
            final long safeDurMs = Double.isFinite(durationSeconds)
                ? Math.max(1000L, Math.round(durationSeconds * 1000.0))
                : 180_000L;

            runOnUiThread(() -> {
                if (!isTrustedLocalWebViewOrigin()) return;
                AudioKeepAliveService.isPlaybackActive = playing;
                AudioKeepAliveService.isSessionActive = true;
                try {
                    Intent intent = new Intent(MainActivity.this, AudioKeepAliveService.class);
                    intent.setAction(AudioKeepAliveService.ACTION_UPDATE_MEDIA);
                    intent.putExtra(AudioKeepAliveService.EXTRA_PLAYING, playing);
                    intent.putExtra(AudioKeepAliveService.EXTRA_TITLE, safeTitle);
                    intent.putExtra(AudioKeepAliveService.EXTRA_ARTIST, safeArtist);
                    intent.putExtra(AudioKeepAliveService.EXTRA_ALBUM, safeAlbum);
                    intent.putExtra(AudioKeepAliveService.EXTRA_ARTWORK_URL, safeArtwork);
                    intent.putExtra(AudioKeepAliveService.EXTRA_POSITION_MS, safePosMs);
                    intent.putExtra(AudioKeepAliveService.EXTRA_DURATION_MS, safeDurMs);

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
            runOnUiThread(() -> {
                if (!isTrustedLocalWebViewOrigin()) return;
                AudioKeepAliveService.isPlaybackActive = false;
                AudioKeepAliveService.isSessionActive = false;
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
            if (!isAllowedMediaCommand(command)) return;
            final double safeSeek = (Double.isFinite(seekSeconds) && seekSeconds >= 0.0)
                ? seekSeconds
                : -1.0;
            runOnUiThread(() -> {
                if (getBridge() != null && getBridge().getWebView() != null && isTrustedLocalWebViewOrigin()) {
                    String js = "window.__iveNativeMediaCommand && window.__iveNativeMediaCommand('"
                        + command + "', " + safeSeek + ");";
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            });
        });

        if (getBridge() != null && getBridge().getWebView() != null) {
            boolean isDebuggable =
                (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
            WebView.setWebContentsDebuggingEnabled(isDebuggable);

            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setAllowFileAccessFromFileURLs(false);
            settings.setAllowUniversalAccessFromFileURLs(false);
            settings.setGeolocationEnabled(false);

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
