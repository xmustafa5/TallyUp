import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';

export const mmkvStorage: StateStorage = {
  setItem: (name, value) => {
    SecureStore.setItem(name, value);
  },
  getItem: (name) => {
    return SecureStore.getItem(name) ?? null;
  },
  removeItem: (name) => {
    SecureStore.deleteItemAsync(name);
  },
};
