# Project-specific ProGuard / R8 rules for IVE: Dive Archive

# Preserve JavascriptInterface methods exposed to the Capacitor WebView
-keepclassmembers class com.ive.divearchive.MainActivity$NativeAudioBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.ive.divearchive.MainActivity { *; }
-keep class com.ive.divearchive.MainActivity$NativeAudioBridge { *; }
-keep class com.ive.divearchive.KeepAliveWebView { *; }
-keep class com.ive.divearchive.AudioKeepAliveService { *; }

# Preserve Capacitor core & plugin classes invoked reflectively
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Strip verbose source filenames while preserving line numbers for crash diagnostics
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
