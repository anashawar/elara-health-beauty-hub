import type { CapacitorConfig } from '@capacitor/cli';

const isDevMode = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.elarastore.app',
  appName: 'ELARA',
  webDir: 'dist',
  // Only use live-reload server in development — production loads from local bundle
  ...(isDevMode ? {
    server: {
      url: 'https://9bdd477b-18ee-42b7-8219-b2a5905f72d1.lovableproject.com?forceHideBadge=true',
      cleartext: true,
    },
  } : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#a855f7',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
