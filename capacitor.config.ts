import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.clevara.chat',
  appName: 'Clevara',
  webDir: 'dist',
  server: {
    url: "https://clevara.lovable.app",
    cleartext: true
  }
};

export default config;
