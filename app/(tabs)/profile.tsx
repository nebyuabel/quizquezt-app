import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import {
  format,
  startOfMonth,
  getDaysInMonth,
  getDay,
  addMonths,
  subMonths,
  getDate,
} from "date-fns";
import * as ImagePicker from "expo-image-picker";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { useAppContext } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- INTERFACES & CONSTANTS ---
interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  quiz_days?: string[];
  freeze_days?: string[];
  current_streak?: number;
  streak_freeze_count?: number;
  xp?: number;
  created_at?: string;
}

const PRIMARY_COLOR = "#38e07b";
const FREEZE_COLOR = "#3b82f6"; // Blue 500

// --- MAIN COMPONENT ---
export default function ProfileScreen() {
  const { session, refreshUserProfile, darkMode } = useAppContext();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [displayDate, setDisplayDate] = useState(new Date());

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchProfile = async () => {
      if (session) {
        setLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error) {
          Alert.alert("Error", "Could not fetch profile.");
        } else {
          setUserProfile(data);
          setEditUsername(data.username || "");
        }
        setLoading(false);
      }
    };
    fetchProfile();
  }, [session, refreshUserProfile]);

  // --- HANDLER FUNCTIONS ---
  const handleSaveProfile = async () => {
    if (!session) return;
    const { error } = await supabase
      .from("profiles")
      .update({ username: editUsername })
      .eq("id", session.user.id);
    if (error) Alert.alert("Error", error.message);
    else {
      Alert.alert("Success", "Profile updated!");
      setIsEditing(false);
      refreshUserProfile();
    }
  };

  const uploadImage = async (uri: string) => {
    if (!session) return;
    setUploadingAvatar(true);
    const filename = `${session.user.id}/avatar-${uuidv4()}.png`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(filename, blob, { upsert: true });

    if (error) Alert.alert("Error", error.message);
    else {
      const publicURL = supabase.storage.from("avatars").getPublicUrl(filename)
        .data.publicUrl;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicURL })
        .eq("id", session.user.id);
      if (updateError) Alert.alert("Error", updateError.message);
      else refreshUserProfile();
    }
    setUploadingAvatar(false);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) uploadImage(result.assets[0].uri);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  // --- CALENDAR RENDERING LOGIC (FIXED) ---
  const generateCalendarGrid = () => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();

    const monthStart = startOfMonth(displayDate);
    const daysInMonth = getDaysInMonth(displayDate);
    const startDayOfWeek = getDay(monthStart); // 0=Sun, 1=Mon...6=Sat

    // Get days from previous month to fill leading empty cells
    const prevMonth = subMonths(displayDate, 1);
    const daysInPrevMonth = getDaysInMonth(prevMonth);
    const prevMonthDays = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      prevMonthDays.push(daysInPrevMonth - startDayOfWeek + i + 1);
    }

    // Get days from next month to fill trailing empty cells
    const totalCells = 42; // 6 rows * 7 days
    const daysInGrid = startDayOfWeek + daysInMonth;
    const nextMonthDays = [];
    const remainingCells = totalCells - daysInGrid;
    for (let i = 1; i <= remainingCells; i++) {
      nextMonthDays.push(i);
    }

    // Build full grid
    const gridDays = [
      ...prevMonthDays.map((day) => ({
        day,
        isCurrentMonth: false,
        date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day),
      })),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return {
          day,
          isCurrentMonth: true,
          date: new Date(year, month, day),
        };
      }),
      ...nextMonthDays.map((day) => ({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day),
      })),
    ];

    // Chunk into weeks
    const weeks = [];
    for (let i = 0; i < gridDays.length; i += 7) {
      weeks.push(gridDays.slice(i, i + 7));
    }

    // Render grid
    return weeks.map((week, weekIndex) => (
      <View key={`week-${weekIndex}`} className="flex-row justify-center">
        {week.map((cell, dayIndex) => {
          const dateString = format(cell.date, "yyyy-MM-dd");
          const isActive = userProfile?.quiz_days?.includes(dateString);
          const isFreeze = userProfile?.freeze_days?.includes(dateString);

          return (
            <View
              key={`day-${cell.date.getTime()}`}
              className={`w-10 h-10 m-1 items-center justify-center rounded-full`}
              style={{
                backgroundColor: isActive
                  ? PRIMARY_COLOR
                  : isFreeze
                  ? FREEZE_COLOR
                  : "transparent",
              }}
            >
              <Text
                className={`text-sm ${
                  !cell.isCurrentMonth
                    ? "text-gray-500"
                    : isActive
                    ? "text-black font-bold"
                    : isFreeze
                    ? "text-white font-bold"
                    : darkMode
                    ? "text-white"
                    : "text-black"
                }`}
              >
                {cell.day}
              </Text>
            </View>
          );
        })}
      </View>
    ));
  };
  // --- RENDER ---
  if (loading || !userProfile) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-[#121212]">
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      className={`flex-1 ${darkMode ? "bg-[#121212]" : "bg-gray-100"}`}
      style={{
        flex: 1,
        // Critical for Android - prevents content from going under navigation bar
        paddingBottom: Platform.OS === "android" ? insets.bottom + 60 : 0,
      }}
    >
      <View className="flex-1">
        <ScrollView>
          {/* --- Header --- */}
          <View className="flex-row items-center justify-between p-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={darkMode ? "white" : "black"}
              />
            </TouchableOpacity>
            <Text
              className={`text-xl font-bold ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              Profile
            </Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Coming Soon!", "Share your profile with friends.")
              }
            >
              <Ionicons
                name="share-social-outline"
                size={24}
                color={darkMode ? "white" : "black"}
              />
            </TouchableOpacity>
          </View>

          {/* --- Profile Info --- */}
          <View className="flex-col items-center p-4">
            <Image
              source={{
                uri: userProfile.avatar_url || "https://placehold.co/128",
              }}
              className="w-32 h-32 rounded-full mb-4"
            />
            <View className="flex-row items-center gap-2">
              <Text
                className={`text-2xl font-bold ${
                  darkMode ? "text-white" : "text-black"
                }`}
              >
                {userProfile.username}
              </Text>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons
                  name="pencil"
                  size={20}
                  color={darkMode ? "#888" : "#555"}
                />
              </TouchableOpacity>
            </View>
            <Text className="text-base text-gray-400">
              Joined{" "}
              {format(new Date(userProfile.created_at || Date.now()), "yyyy")}
            </Text>
          </View>

          {/* --- Stats Card --- */}
          <View className="px-4">
            <View
              className={`flex-row justify-around rounded-xl p-4 ${
                darkMode ? "bg-[#1C1C1E]" : "bg-white"
              }`}
            >
              <View className="items-center">
                <Text
                  className={`text-lg font-bold ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {userProfile.current_streak || 0}
                </Text>
                <Text className="text-sm text-gray-400">Streak</Text>
              </View>
              <View className="items-center">
                <Text
                  className={`text-lg font-bold ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {userProfile.xp || 0}
                </Text>
                <Text className="text-sm text-gray-400">Total XP</Text>
              </View>
              <View className="items-center">
                <Text
                  className={`text-lg font-bold ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {userProfile.streak_freeze_count || 0}
                </Text>
                <Text className="text-sm text-gray-400">Freeze Days</Text>
              </View>
            </View>
          </View>

          {/* --- Streak Calendar --- */}
          {/* --- Streak Calendar --- */}
          <Text
            className={`px-4 pb-2 pt-6 text-xl font-bold ${
              darkMode ? "text-white" : "text-black"
            }`}
          >
            Streak Calendar
          </Text>
          <View className="px-4">
            <View
              className={`rounded-xl p-4 ${
                darkMode ? "bg-[#1C1C1E]" : "bg-white"
              }`}
            >
              <View className="flex-row items-center justify-between pb-4">
                <TouchableOpacity
                  onPress={() => setDisplayDate(subMonths(displayDate, 1))}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={darkMode ? "white" : "black"}
                  />
                </TouchableOpacity>
                <Text
                  className={`text-base font-bold ${
                    darkMode ? "text-white" : "text-black"
                  }`}
                >
                  {format(displayDate, "MMMM yyyy")}
                </Text>
                <TouchableOpacity
                  onPress={() => setDisplayDate(addMonths(displayDate, 1))}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={darkMode ? "white" : "black"}
                  />
                </TouchableOpacity>
              </View>
              <View className="flex-row justify-center">
                {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                  <View key={d} className="w-10 m-1 items-center">
                    <Text className="text-sm font-bold text-gray-400">{d}</Text>
                  </View>
                ))}
              </View>
              {/* ✅ Fixed height for 6 rows */}
              <View style={{ height: 240 }}>{generateCalendarGrid()}</View>
              <View className="mt-4 flex-row items-center justify-start gap-4">
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  ></View>
                  <Text className="text-xs text-gray-400">Active Day</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <View className="h-4 w-4 rounded-full bg-blue-500"></View>
                  <Text className="text-xs text-gray-400">Freeze Day</Text>
                </View>
              </View>
            </View>
          </View>

          {/* --- Log Out Button --- */}
          <View className="px-4 mt-8">
            <TouchableOpacity
              onPress={handleSignOut}
              className="p-4 rounded-lg border-2 border-red-500 items-center"
            >
              <Text className="font-bold text-red-500">Log Out</Text>
            </TouchableOpacity>
          </View>

          <View className="h-24" />
          {/* Spacer for footer */}
        </ScrollView>
      </View>

      {/* --- Footer --- */}

      {/* --- Edit Profile Modal --- */}
      <Modal
        visible={isEditing}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditing(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-end bg-black/60"
          activeOpacity={1}
          onPress={() => setIsEditing(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className={`w-full p-6 rounded-t-3xl shadow-lg ${
              darkMode ? "bg-[#1C1C1E]" : "bg-white"
            }`}
          >
            <TouchableOpacity
              onPress={pickImage}
              className="relative w-28 h-28 rounded-full mb-6 self-center"
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="large" />
              ) : (
                <Image
                  source={{
                    uri: userProfile.avatar_url || "https://placehold.co/112",
                  }}
                  className="w-28 h-28 rounded-full border-4 border-purple-500"
                />
              )}
              <View
                className={`absolute bottom-0 right-0 p-2 rounded-full border-2 ${
                  darkMode
                    ? "border-gray-900 bg-purple-600"
                    : "border-white bg-purple-500"
                }`}
              >
                <Ionicons name="camera" size={16} color="white" />
              </View>
            </TouchableOpacity>
            <TextInput
              placeholder="Enter username"
              placeholderTextColor={darkMode ? "#777" : "#aaa"}
              className={`p-4 rounded-lg mb-6 w-full text-lg border ${
                darkMode
                  ? "bg-[#2C2C2E] border-purple-500 text-white"
                  : "bg-gray-100 border-purple-400 text-black"
              }`}
              value={editUsername}
              onChangeText={setEditUsername}
            />
            <TouchableOpacity
              onPress={handleSaveProfile}
              className="p-4 rounded-lg items-center w-full bg-purple-600"
            >
              <Text className="text-white text-xl font-bold">Save Changes</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
