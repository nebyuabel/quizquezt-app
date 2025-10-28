// app/settings.tsx
import React, { useState, useEffect } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Add this import at the top of settings.tsx
import { supabase } from "@/lib/supabaseClient";

// Define the primary accent color
const ACCENT_COLOR = "#4ade80";

export default function SettingsScreen() {
  const {
    darkMode,
    isSoundEnabled,
    isHapticEnabled,
    isNotificationEnabled,
    toggleDarkMode,
    toggleSound,
    toggleHaptics,
    toggleNotifications,
    activatePremium,
    logout,
    userProfile,
    refreshUserProfile, // ✅ ADD THIS
  } = useAppContext();

  const [premiumCode, setPremiumCode] = useState("");
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isPremiumActive, setIsPremiumActive] = useState(false);
  const [activating, setActivating] = useState(false);

  const insets = useSafeAreaInsets();

  // Check if premium is active and calculate time remaining
  useEffect(() => {
    const checkPremiumStatus = () => {
      console.log("Checking premium status:", {
        is_premium: userProfile?.is_premium,
        premium_until: userProfile?.premium_until,
      });

      if (userProfile?.is_premium && userProfile?.premium_until) {
        const expiryDate = new Date(userProfile.premium_until);
        const now = new Date();

        if (expiryDate > now) {
          setIsPremiumActive(true);
          updateTimeRemaining(expiryDate, now);
        } else {
          // Premium has expired
          setIsPremiumActive(false);
          setTimeRemaining("");
        }
      } else {
        setIsPremiumActive(false);
        setTimeRemaining("");
      }
    };

    const updateTimeRemaining = (expiryDate: Date, now: Date) => {
      const diff = expiryDate.getTime() - now.getTime();

      if (diff <= 0) {
        setIsPremiumActive(false);
        setTimeRemaining("");
        return;
      }

      // Calculate days, hours, minutes, seconds
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    // Check immediately
    checkPremiumStatus();

    // Update every second if premium is active
    let interval: NodeJS.Timeout;
    if (isPremiumActive) {
      interval = setInterval(() => {
        if (userProfile?.premium_until) {
          const expiryDate = new Date(userProfile.premium_until);
          const now = new Date();
          updateTimeRemaining(expiryDate, now);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userProfile?.is_premium, userProfile?.premium_until, isPremiumActive]);

  // In settings.tsx - update the handleActivatePremium function
  const handleActivatePremium = async () => {
    if (premiumCode.length === 0) {
      Alert.alert("Error", "Please enter a premium code.");
      return;
    }

    setActivating(true);
    try {
      console.log("🔄 Starting activation process...");

      // Wait for the activation to complete and get the result
      const success = await activatePremium(premiumCode);
      console.log("🔄 Activation result:", success);

      if (success) {
        // Only clear if successful
        setPremiumCode("");

        // Force a refresh of the user profile
        console.log("🔄 Refreshing user profile...");
        await refreshUserProfile();

        // Check the updated status
        console.log("🔄 After refresh - is_premium:", userProfile?.is_premium);
        console.log(
          "🔄 After refresh - premium_until:",
          userProfile?.premium_until
        );
      }
    } catch (error) {
      console.error("❌ Settings activation error:", error);
    } finally {
      setActivating(false);
      console.log("🔄 Activation process completed");
    }
  };

  // Format expiry date for display
  const getExpiryDateText = () => {
    if (!userProfile?.premium_until) return "";

    const expiryDate = new Date(userProfile.premium_until);
    return expiryDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  // Add this temporary function to your settings.tsx for testing
  // const testDatabaseConnection = async () => {
  //   try {
  //     console.log("🧪 Testing database connection...");

  //     // Simple query to test connection
  //     const { data, error } = await supabase
  //       .from("premium_codes")
  //       .select("count")
  //       .limit(1);

  //     if (error) {
  //       console.log("❌ Database connection error:", error);
  //       Alert.alert(
  //         "Database Error",
  //         "Cannot connect to database: " + error.message
  //       );
  //     } else {
  //       console.log("✅ Database connection successful");
  //       Alert.alert("Success", "Database connection is working!");
  //     }
  //   } catch (error) {
  //     console.log("❌ Database test error:", error);
  //     Alert.alert("Error", "Database test failed: " + error);
  //   }
  // };
  // // Add this to your settings.tsx to check RLS
  // const checkRLSPolicies = async () => {
  //   try {
  //     console.log("🔐 Checking RLS policies...");

  //     // Try to insert a test record to see if RLS is blocking
  //     const testCode = "TEST" + Date.now();

  //     const { data: insertData, error: insertError } = await supabase
  //       .from("premium_codes")
  //       .insert([
  //         {
  //           code: testCode,
  //           expires_at: new Date(
  //             Date.now() + 30 * 24 * 60 * 60 * 1000
  //           ).toISOString(), // 30 days from now
  //           is_used: false,
  //         },
  //       ])
  //       .select();

  //     if (insertError) {
  //       console.log("❌ Insert failed (likely RLS):", insertError);
  //       Alert.alert(
  //         "RLS Check",
  //         "Insert failed - RLS might be blocking: " + insertError.message
  //       );
  //     } else {
  //       console.log("✅ Insert succeeded:", insertData);

  //       // Clean up the test record
  //       await supabase.from("premium_codes").delete().eq("code", testCode);

  //       Alert.alert(
  //         "RLS Check",
  //         "Insert succeeded - RLS might not be blocking basic operations"
  //       );
  //     }
  //   } catch (error) {
  //     console.error("❌ RLS check error:", error);
  //     Alert.alert("Error", "RLS check failed: " + error);
  //   }
  // };
  // // Add this test function to settings.tsx
  // const testPremiumCodesQuery = async () => {
  //   try {
  //     console.log("🧪 Testing premium_codes query...");

  //     // Test 1: Simple count query
  //     const { count, error: countError } = await supabase
  //       .from("premium_codes")
  //       .select("*", { count: "exact", head: true });

  //     console.log("Count test:", { count, error: countError });

  //     // Test 2: Simple select with limit
  //     const { data: simpleData, error: simpleError } = await supabase
  //       .from("premium_codes")
  //       .select("code")
  //       .limit(1);

  //     console.log("Simple select test:", {
  //       data: simpleData,
  //       error: simpleError,
  //     });

  //     // Test 3: Try without any filters
  //     const { data: allData, error: allError } = await supabase
  //       .from("premium_codes")
  //       .select("*");

  //     console.log("All data test:", { data: allData, error: allError });

  //     if (countError || simpleError || allError) {
  //       Alert.alert(
  //         "Query Test Failed",
  //         `Count: ${countError?.message || "success"}\n` +
  //           `Simple: ${simpleError?.message || "success"}\n` +
  //           `All: ${allError?.message || "success"}`
  //       );
  //     } else {
  //       Alert.alert(
  //         "Query Test Passed",
  //         `Total codes: ${count}\n` +
  //           `First code: ${simpleData?.[0]?.code || "none"}\n` +
  //           `All codes count: ${allData?.length || 0}`
  //       );
  //     }
  //   } catch (error) {
  //     console.error("❌ Premium codes test error:", error);
  //     Alert.alert("Test Error", "Failed to test premium codes: " + error);
  //   }
  // };
  // // Add this test to settings.tsx
  // const testOtherTables = async () => {
  //   try {
  //     console.log("🧪 Testing other tables...");

  //     // Test 1: Query profiles table (which we know works)
  //     const { data: profilesData, error: profilesError } = await supabase
  //       .from("profiles")
  //       .select("id, username")
  //       .limit(1);

  //     console.log("Profiles test:", {
  //       data: profilesData,
  //       error: profilesError,
  //     });

  //     // Test 2: Query settings table
  //     const { data: settingsData, error: settingsError } = await supabase
  //       .from("settings")
  //       .select("user_id")
  //       .limit(1);

  //     console.log("Settings test:", {
  //       data: settingsData,
  //       error: settingsError,
  //     });

  //     // Test 3: Try a different query method for premium_codes
  //     const { data: rawData, error: rawError } = await supabase
  //       .from("premium_codes")
  //       .select("*");

  //     console.log("Raw premium_codes test:", {
  //       data: rawData,
  //       error: rawError,
  //     });

  //     if (profilesError || settingsError || rawError) {
  //       Alert.alert(
  //         "Table Test Results",
  //         `Profiles: ${profilesError?.message || "success"}\n` +
  //           `Settings: ${settingsError?.message || "success"}\n` +
  //           `Premium Codes: ${rawError?.message || "success"}`
  //       );
  //     } else {
  //       Alert.alert(
  //         "Table Test Results",
  //         `Profiles: ${profilesData?.length || 0} records\n` +
  //           `Settings: ${settingsData?.length || 0} records\n` +
  //           `Premium Codes: ${rawData?.length || 0} records`
  //       );
  //     }
  //   } catch (error) {
  //     console.error("❌ Table test error:", error);
  //     Alert.alert("Test Error", "Failed to test tables: " + error);
  //   }
  // };

  return (
    <SafeAreaView
      className={`flex-1 ${darkMode ? "bg-stone-950" : "bg-white"}`}
      style={{
        flex: 1,
        // Critical for Android - prevents content from going under navigation bar
        paddingBottom: Platform.OS === "android" ? insets.bottom : 0,
      }}
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
              {!isPremiumActive ? (
                // Show activation form when premium is not active
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
                      editable={!activating}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleActivatePremium}
                    disabled={activating}
                    className={`p-2 rounded-lg ${
                      activating
                        ? "bg-stone-500"
                        : darkMode
                        ? "bg-stone-700"
                        : "bg-stone-300"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        darkMode ? "text-white" : "text-black"
                      }`}
                    >
                      {activating ? "..." : "Activate"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Show countdown timer when premium is active
                <View className="flex-row items-center gap-4 p-4">
                  <View
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                      darkMode ? "bg-amber-500/20" : "bg-amber-400/20"
                    }`}
                  >
                    <Ionicons
                      name="star"
                      size={20}
                      color="#f59e0b" // Amber color for active premium
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`font-medium ${
                        darkMode ? "text-amber-400" : "text-amber-600"
                      }`}
                    >
                      Premium Active
                    </Text>
                    <Text
                      className={`text-sm ${
                        darkMode ? "text-amber-300" : "text-amber-500"
                      } mt-1 font-medium`}
                    >
                      Expires in: {timeRemaining}
                    </Text>
                    <Text
                      className={`text-xs ${
                        darkMode ? "text-stone-400" : "text-stone-500"
                      } mt-1`}
                    >
                      Until {getExpiryDateText()}
                    </Text>
                  </View>
                  <View
                    className={`p-2 rounded-lg ${
                      darkMode ? "bg-amber-500/20" : "bg-amber-400/20"
                    }`}
                  >
                    <Ionicons name="time-outline" size={20} color="#f59e0b" />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Debug Section - Remove in production */}

          {/* {__DEV__ && (
            <View className="px-4 mt-4">
              <Text
                className={`text-sm mb-2 ${
                  darkMode ? "text-red-400" : "text-red-600"
                }`}
              >
                Debug: is_premium: {userProfile?.is_premium ? "true" : "false"}
              </Text>
              <Text
                className={`text-sm mb-2 ${
                  darkMode ? "text-red-400" : "text-red-600"
                }`}
              >
                Debug: premium_until: {userProfile?.premium_until || "null"}
              </Text>
              <TouchableOpacity
                onPress={testOtherTables}
                className="p-2 bg-indigo-500 rounded-lg mb-2"
              >
                <Text className="text-white text-center">
                  Test Other Tables
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={testPremiumCodesQuery}
                className="p-2 bg-pink-500 rounded-lg mb-2"
              >
                <Text className="text-white text-center">
                  Test Premium Codes Query
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={checkRLSPolicies}
                className="p-2 bg-orange-500 rounded-lg mb-2"
              >
                <Text className="text-white text-center">
                  Check RLS Policies
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={testDatabaseConnection}
                className="p-2 bg-green-500 rounded-lg mb-2"
              >
                <Text className="text-white text-center">
                  Test Database Connection
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={refreshUserProfile}
                className="p-2 bg-blue-500 rounded-lg"
              >
                <Text className="text-white text-center">Manual Refresh</Text>
              </TouchableOpacity>
            </View>
          )} */}

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
