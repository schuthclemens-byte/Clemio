import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.clemio.chat',
  appName: 'Clemio',
  webDir: 'dist',
  server: {
    url: "https://clemio.lovable.app",
    cleartext: true
  }
};

export default config;
