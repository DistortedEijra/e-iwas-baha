import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ph.edu.tip.eIwasBaha',
  appName: 'E-Iwas Baha',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Geolocation: {
      // Android requires these in AndroidManifest.xml (cap sync inserts them)
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1e40af',
      sound: 'beep.wav',
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#1e40af',
      showSpinner: false,
    },
  },
};

export default config;
