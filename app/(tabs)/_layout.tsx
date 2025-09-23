import React from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
// No need for Notifications logic here, it's handled in root _layout.tsx now.

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hide header for all tab screens; each screen will have custom content
        tabBarStyle: {
          backgroundColor: "#1f2937", // Dark background for the tab bar
          borderTopWidth: 0, // No border at the top
          paddingBottom: Platform.OS === "ios" ? 20 : 5, // Adjust padding for iOS safe area
          height: Platform.OS === "ios" ? 80 : 60, // Adjust height for iOS safe area
        },
        tabBarActiveTintColor: "#AAFF00", // Purple active icon/label color
        tabBarInactiveTintColor: "#9ca3af", // Gray inactive icon/label color
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "bold",
        },
        tabBarIconStyle: {
          marginTop: 5, // Give icons a little space from the top
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="trophy-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ color }) => (
            <Ionicons name="document-text-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="flashcards"
        options={{
          title: "Flashcards",
          tabBarIcon: ({ color }) => (
            <Ionicons name="card-outline" size={24} color={color} />
          ),
        }}
      />
      {/*
        The following screens are not intended to be directly accessible via tabs,
        but rather through navigation from other parts of the app (e.g., Home screen icons).
        'href: null' hides them from the tab bar but keeps them within the tab's stack context.
      */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="store" options={{ href: null }} />

      {/* This screen is implicitly removed via new home design */}

      {/* The edit-profile screen has been merged into profile.tsx, so it's not a standalone route */}
    </Tabs>
  );
}
