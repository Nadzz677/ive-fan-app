import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ive.divearchive",
  appName: "IVE: Dive Archive",
  webDir: "dist-mobile",
  server: {
    // Load the live Firebase Hosting bundle so UI, bug-fix, and feature deploys
    // appear automatically on next app launch without reinstalling the APK.
    url: "https://ive-dive-archive.web.app",
    androidScheme: "https",
    allowNavigation: ["ive-dive-archive.web.app"],
    errorPath: "offline.html",
  },
  android: {
    backgroundColor: "#1a1326",
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SystemBars: {
      insetsHandling: "disable",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1a1326",
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#000000",
      showSpinner: false,
    },
  },
};

export default config;
