import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ive.divearchive",
  appName: "IVE: Dive Archive",
  webDir: "dist-mobile",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#1a1326",
    allowMixedContent: false,
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
