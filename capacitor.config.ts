import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.clemio.chat',
  appName: 'Clemio',
  webDir: 'dist',
  android: {
    // Use HTTPS scheme for all web content (required for service workers, secure cookies, etc.)
    scheme: 'https',
    // Block cleartext (HTTP) traffic for security
    allowMixedContent: false,
  },
  server: {
    // Load from local dist (not remote URL) for native performance
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#FFF7ED',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFF7ED',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
