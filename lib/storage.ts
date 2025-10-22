// lib/storage.ts (Corrected)
import AsyncStorage from "@react-native-async-storage/async-storage";

// Custom storage adapter for Supabase that uses AsyncStorage
export const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn("Storage getItem error:", error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn("Storage setItem error:", error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn("Storage removeItem error:", error);
    }
  },
};
