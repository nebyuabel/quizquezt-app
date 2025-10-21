import { useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { Alert } from "react-native";

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);

      // Optional: Show alert when connection is lost
      if (!connected) {
        Alert.alert(
          "No Internet Connection",
          "Some features may not work offline.",
          [{ text: "OK" }]
        );
      }
    });

    return () => unsubscribe();
  }, []);

  return isConnected;
}
