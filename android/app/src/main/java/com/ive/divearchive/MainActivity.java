package com.ive.divearchive;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Restore smooth hardware rendering and prevent Autofill interference
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getWindow().getDecorView().setImportantForAutofill(
                    View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
                );
                webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            }
        }
    }
}
