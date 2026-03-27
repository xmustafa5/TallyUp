import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

function createStorage() {
  if (Platform.OS === 'web') {
    return null;
  }
  const { MMKV } = require('react-native-mmkv');
  return new MMKV();
}

const storage = createStorage();

const webStorage: StateStorage = {
  setItem: (name, value) => {
    localStorage.setItem(name, value);
  },
  getItem: (name) => {
    return localStorage.getItem(name) ?? null;
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

const nativeStorage: StateStorage = {
  setItem: (name, value) => {
    storage?.set(name, value);
  },
  getItem: (name) => {
    const value = storage?.getString(name);
    return value ?? null;
  },
  removeItem: (name) => {
    storage?.delete(name);
  },
};

export const mmkvStorage: StateStorage =
  Platform.OS === 'web' ? webStorage : nativeStorage;

export { storage as mmkv };
