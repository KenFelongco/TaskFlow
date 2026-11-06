import { Platform } from 'react-native';
import Constants from 'expo-constants';

declare const window: any;

/**
 * Automatically resolves the backend server address.
 * - On Web: uses the current window hostname (e.g. 'localhost' or your LAN IP).
 * - On Android Emulator: maps to 10.0.2.2 (the special QEMU host loopback alias).
 * - On Physical Devices (Expo Go or standalone APK): uses the Wi-Fi LAN IP (192.168.1.28).
 */
function getBackendHost(): string {
  // 1. Web Browser
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return window.location.hostname;
    }
    return 'localhost';
  }

  // 2. Mobile with Expo Go / dev client
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') return ip;
  }

  // 3. Physical Android Device in Standalone APK
  if (Constants.isDevice) {
    return '192.168.1.28';
  }

  // 4. Android Emulator in Standalone APK or Expo
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  // 5. Fallback Host
  return '192.168.1.28';
}

let currentHost = getBackendHost();
export const BACKEND_PORT = 5000;
export let BACKEND_URL = `http://${currentHost}:${BACKEND_PORT}`;
export let API_URL = `${BACKEND_URL}/api`;

export const setResolvedBackendHost = (newHost: string) => {
  currentHost = newHost;
  BACKEND_URL = `http://${newHost}:${BACKEND_PORT}`;
  API_URL = `${BACKEND_URL}/api`;
  console.log(`🌐 [TaskFlow API] Switched Backend URL: ${BACKEND_URL}`);
};

export const getCandidateHosts = (): string[] => {
  if (Platform.OS === 'web') return ['localhost', '127.0.0.1'];
  if (Platform.OS === 'android') {
    return ['192.168.1.28', '10.0.2.2', '127.0.0.1', 'localhost'];
  }
  return ['192.168.1.28', 'localhost'];
};

console.log(`🌐 [TaskFlow API] Configured Backend URL: ${BACKEND_URL} (Platform: ${Platform.OS}, isDevice: ${Constants.isDevice})`);

