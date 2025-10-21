import React from "react";
import { View, Text, Animated } from "react-native";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Ionicons } from "@expo/vector-icons";

export default function OfflineBanner() {
  const isConnected = useNetworkStatus();

  if (isConnected) return null;

  return (
    <Animated.View
      className="bg-red-500 px-4 py-3 flex-row items-center justify-center"
      style={{ elevation: 8 }}
    >
      <Ionicons name="wifi-outline" size={20} color="white" />
      <Text className="text-white font-semibold ml-2 text-center">
        No internet connection
      </Text>
    </Animated.View>
  );
}
