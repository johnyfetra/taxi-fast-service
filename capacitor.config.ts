import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mg.taxifastservice.app',
  appName: 'Taxi Fast Service',
  webDir: 'capacitor-fallback',
  server: {
    // Production: https://taxi-fast-service.vercel.app
    // Staging: https://taxi-fast-service-git-main-<org>.vercel.app
    // Local dev: http://localhost:3000
    url: 'https://taxi-fast-service.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFFFFF',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#FFFFFF',
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#D81F26',
    },
  },
};

export default config;
