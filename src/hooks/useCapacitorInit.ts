import { useEffect } from "react";

/**
 * Initializes Capacitor plugins that need to run once on app start.
 * Safe to call on web — silently skips when not in native context.
 */
export const useCapacitorInit = () => {
  useEffect(() => {
    const init = async () => {
      try {
        const w = window as any;
        if (!w.Capacitor?.getPlatform || w.Capacitor.getPlatform() === "web") return;

        // Hide splash screen after app is ready
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();

        // Configure status bar
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#FFF7ED" });

        // Handle Android back button
        const { App } = await import("@capacitor/app");
        App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });

        console.log("[Capacitor] Native plugins initialized");
      } catch (error) {
        console.log("[Capacitor] Init skipped (web context)");
      }
    };

    init();
  }, []);
};
