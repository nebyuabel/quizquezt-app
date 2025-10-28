import React from "react";
import { Tabs } from "expo-router";
import { Platform, StatusBar, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Android-specific calculations
  const androidTabBarHeight = 60;
  const androidBottomPadding = Platform.OS === "android" ? 16 : 0;

  return (
    <View
      style={{
        flex: 1,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#1f2937",
            borderTopWidth: 0,
            height: Platform.OS === "ios" ? 80 : 60,
            paddingBottom:
              Platform.OS === "ios" ? 20 : Math.max(insets.bottom, 16), // ensures min 16px on Android
            paddingHorizontal: 16,
          },
          tabBarActiveTintColor: "#AAFF00",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "bold",
            // Android-specific label styling
            marginBottom: Platform.OS === "android" ? 4 : 0,
          },
          tabBarIconStyle: {
            marginTop: Platform.OS === "ios" ? 5 : 2,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: "Leaderboard",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "trophy" : "trophy-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            title: "Notes",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "document-text" : "document-text-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="flashcards"
          options={{
            title: "Flashcards",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "card" : "card-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />

        {/* Hidden tabs */}
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="store" options={{ href: null }} />
      </Tabs>
    </View>
  );
}
