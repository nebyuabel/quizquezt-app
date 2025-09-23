// app/settings.tsx
import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { useAppContext } from "@/context/ThemeContext";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Define the primary accent color
const ACCENT_COLOR = "#4ade80";

export default function SettingsScreen() {
  const {
    darkMode,
    isSoundEnabled,
    isHapticEnabled,
    isNotificationEnabled, // ✅ NEW
    toggleDarkMode,
    toggleSound,
    toggleHaptics,
    toggleNotifications, // ✅ NEW
    activatePremium,
    logout,
  } = useAppContext();

  const [premiumCode, setPremiumCode] = useState("");

  const handleActivatePremium = async () => {
    if (premiumCode.length === 0) {
      Alert.alert("Error", "Please enter a premium code.");
      return;
    }
    await activatePremium(premiumCode);
  };

  return (
    <SafeAreaView
      className={`flex-1 ${darkMode ? "bg-stone-950" : "bg-white"}`}
    >
      {/* Header */}
      <View
        className={`flex-row justify-between items-center p-4 border-b ${
          darkMode
            ? "bg-stone-950/80 border-stone-800"
            : "bg-white/80 border-stone-200"
        } backdrop-blur-sm sticky top-0 z-10`}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons
            name="arrow-back-outline"
            size={24}
            color={darkMode ? "white" : "black"}
          />
        </TouchableOpacity>
        <Text
          className={`text-xl font-bold flex-1 text-center ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          Settings
        </Text>
        <View className="w-8" />
      </View>

      <ScrollView className="px-4 py-6">
        <View className="space-y-8">
          {/* General Section */}
          <View>
            <Text className="px-4 pb-2 text-sm font-semibold uppercase tracking-wider text-stone-400">
              General
            </Text>
            <View
              className={`space-y-px overflow-hidden rounded-lg ${
                darkMode ? "bg-stone-900" : "bg-stone-100"
              }`}
            >
              {/* Premium Code Input Section */}
              <View className="flex-row items-center gap-4 p-4">
                <View
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    darkMode ? "bg-stone-800" : "bg-stone-200"
                  }`}
                >
                  <Ionicons
                    name="star-outline"
                    size={20}
                    color={darkMode ? ACCENT_COLOR : "black"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-medium ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    Premium Code
                  </Text>
                  <TextInput
                    className={`text-sm ${
                      darkMode ? "text-stone-400" : "text-stone-500"
                    } mt-1`}
                    placeholder="Enter code here"
                    placeholderTextColor={darkMode ? "#78716c" : "#a1a1aa"}
                    value={premiumCode}
                    onChangeText={setPremiumCode}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleActivatePremium}
                  className={`p-2 rounded-lg ${
                    darkMode ? "bg-stone-700" : "bg-stone-300"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    Activate
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* App Preferences Section */}
          <View>
            <Text className="px-4 pb-2 text-sm font-semibold uppercase tracking-wider text-stone-400">
              App Preferences
            </Text>
            <View
              className={`space-y-px overflow-hidden rounded-lg ${
                darkMode ? "bg-stone-900" : "bg-stone-100"
              }`}
            >
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center gap-4">
                  <View
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                      darkMode ? "bg-stone-800" : "bg-stone-200"
                    }`}
                  >
                    <Ionicons
                      name="moon-outline"
                      size={20}
                      color={darkMode ? ACCENT_COLOR : "black"}
                    />
                  </View>
                  <Text
                    className={`text-lg font-medium ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    Dark Mode
                  </Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: "#767577", true: ACCENT_COLOR }}
                  thumbColor={darkMode ? "#f4f3f4" : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
              <View
                className={`h-px w-full ${
                  darkMode ? "bg-stone-800" : "bg-stone-200"
                }`}
              />
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center gap-4">
                  <View
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                      darkMode ? "bg-stone-800" : "bg-stone-200"
                    }`}
                  >
                    <Ionicons
                      name="volume-high-outline"
                      size={20}
                      color={darkMode ? ACCENT_COLOR : "black"}
                    />
                  </View>
                  <Text
                    className={`text-lg font-medium ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    Sound Effects
                  </Text>
                </View>
                <Switch
                  value={isSoundEnabled}
                  onValueChange={toggleSound}
                  trackColor={{ false: "#767577", true: ACCENT_COLOR }}
                  thumbColor={isSoundEnabled ? "#f4f3f4" : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
              <View
                className={`h-px w-full ${
                  darkMode ? "bg-stone-800" : "bg-stone-200"
                }`}
              />
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center gap-4">
                  <View
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                      darkMode ? "bg-stone-800" : "bg-stone-200"
                    }`}
                  >
                    <Ionicons
                      name="phone-portrait-outline"
                      size={20}
                      color={darkMode ? ACCENT_COLOR : "black"}
                    />
                  </View>
                  <Text
                    className={`text-lg font-medium ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    Haptic Feedback
                  </Text>
                </View>
                <Switch
                  value={isHapticEnabled}
                  onValueChange={toggleHaptics}
                  trackColor={{ false: "#767577", true: ACCENT_COLOR }}
                  thumbColor={isHapticEnabled ? "#f4f3f4" : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
              <View
                className={`h-px w-full ${
                  darkMode ? "bg-stone-800" : "bg-stone-200"
                }`}
              />
              {/* ✅ NEW: Notification Toggle */}
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center gap-4">
                  <View
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                      darkMode ? "bg-stone-800" : "bg-stone-200"
                    }`}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={20}
                      color={darkMode ? ACCENT_COLOR : "black"}
                    />
                  </View>
                  <Text
                    className={`text-lg font-medium ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    Daily Reminders
                  </Text>
                </View>
                <Switch
                  value={isNotificationEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: "#767577", true: ACCENT_COLOR }}
                  thumbColor={isNotificationEnabled ? "#f4f3f4" : "#f4f3f4"}
                  ios_backgroundColor="#3e3e3e"
                />
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <View className="px-4 mt-3">
            <TouchableOpacity
              className="flex h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-red-500/10 text-center"
              onPress={logout}
            >
              <Text className="truncate font-semibold text-red-400">
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
