const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const iosConfig = './GoogleService-Info.plist';
const androidConfig = './google-services.json';
const firebaseNativeConfigured = existsSync(resolve(__dirname, iosConfig)) && existsSync(resolve(__dirname, androidConfig));
const firebasePlugins = new Set([
  '@react-native-firebase/app',
  '@react-native-firebase/auth',
  '@react-native-firebase/app-check',
  '@react-native-firebase/messaging',
]);

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    ...(firebaseNativeConfigured ? { googleServicesFile: iosConfig } : {}),
  },
  android: {
    ...config.android,
    ...(firebaseNativeConfigured ? { googleServicesFile: androidConfig } : {}),
  },
  plugins: (config.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return firebaseNativeConfigured || !firebasePlugins.has(name);
  }),
  extra: {
    ...config.extra,
    firebaseNativeConfigured,
  },
});
