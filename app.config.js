// app.config.js
module.exports = {
  expo: {
    name: 'AllNightLong',
    slug: 'allnightlong',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#04040a',
    },
    scheme: 'anl',
    deepLinking: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.cloudygetty.allnightlong',
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription: 'AllNightLong uses your camera for video calls.',
        NSMicrophoneUsageDescription: 'AllNightLong uses your microphone for video calls.',
        NSPhotoLibraryUsageDescription: 'AllNightLong accesses your photo library to set your profile photo.',
        NSLocationWhenInUseUsageDescription: 'AllNightLong uses your location to show you nearby matches.',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'AllNightLong uses your location to surface matches near you.',
        UIBackgroundModes: ['fetch', 'remote-notification'],
      },
    },
    android: {
      package: 'com.cloudygetty.allnightlong',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#04040a',
      },
      permissions: [
        'CAMERA',
        'RECORD_AUDIO',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'VIBRATE',
        'RECEIVE_BOOT_COMPLETED',
      ],
      googleServicesFile: './google-services.json',
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#a855f7',
          sounds: ['./assets/sounds/notification.wav'],
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'AllNightLong uses your location to show you matches nearby.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'AllNightLong uses your camera for video calls.',
          microphonePermission: 'AllNightLong uses your microphone for video calls.',
        },
      ],
      '@stripe/stripe-react-native',
    ],
    extra: {
      eas: {
        projectId: 'YOUR_EAS_PROJECT_ID',
      },
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      wsUrl: process.env.EXPO_PUBLIC_WS_URL,
    },
  },
};
