package com.ive.divearchive;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import com.getcapacitor.CapacitorWebView;

/**
 * Custom CapacitorWebView subclass that prevents Android's WindowManager from sending
 * View.GONE / View.INVISIBLE to Chromium while music is actively playing in the background.
 *
 * Without this override, swiping to the Home screen dispatches onWindowVisibilityChanged(GONE)
 * directly to Chromium's C++ compositor, which immediately suspends cross-origin YouTube iframes
 * and WebView media decoders even if WebView.onResume() was called!
 */
public class KeepAliveWebView extends CapacitorWebView {

    public KeepAliveWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    protected void onWindowVisibilityChanged(int visibility) {
        if (visibility != View.VISIBLE && AudioKeepAliveService.isSessionActive) {
            // Trick Chromium into keeping its compositor & audio/iframe pipelines active!
            super.onWindowVisibilityChanged(View.VISIBLE);
            return;
        }
        super.onWindowVisibilityChanged(visibility);
    }

    @Override
    public void onWindowFocusChanged(boolean hasWindowFocus) {
        if (!hasWindowFocus && AudioKeepAliveService.isSessionActive) {
            // Keep focus state active for embedded media players while backgrounded
            super.onWindowFocusChanged(true);
            return;
        }
        super.onWindowFocusChanged(hasWindowFocus);
    }
}
