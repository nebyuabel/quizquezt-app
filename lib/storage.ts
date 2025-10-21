// lib/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// Custom storage adapter that handles web environment
export const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Check if we're in a web environment
      if (typeof window !== "undefined") {
        return await AsyncStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.warn("Storage getItem error:", error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window !== "undefined") {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn("Storage setItem error:", error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (typeof window !== "undefined") {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.warn("Storage removeItem error:", error);
    }
  },
};
