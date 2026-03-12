import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elara.app',
  appName: 'ELARA',
  webDir: 'dist',
  server: {
    url: 'https://9bdd477b-18ee-42b7-8219-b2a5905f72d1.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
