import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SafeAreaView,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons";
import { useAppContext } from "@/context/ThemeContext";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

// --- INTERFACES & HELPERS ---
const XP_TIERS = [
  { name: "Rookie Thinker", xp: 0, icon: "brain-outline", color: "#a0a0a0" },
  {
    name: "Curious Apprentice",
    xp: 500,
    icon: "book-outline",
    color: "#8080ff",
  },
  { name: "Quiz Adept", xp: 1250, icon: "target-outline", color: "#00ff00" },
  {
    name: "Trivia Scholar",
    xp: 2500,
    icon: "school-outline",
    color: "#ffff00",
  },
  { name: "Knowledge Sage", xp: 5000, icon: "logo-snapchat", color: "#ffa500" },
  {
    name: "Grandmaster Brainiac",
    xp: 10000,
    icon: "md-trophy",
    color: "#ff00ff",
  },
];

const getTier = (xp: number) => {
  for (let i = XP_TIERS.length - 1; i >= 0; i--) {
    if (xp >= XP_TIERS[i].xp) return XP_TIERS[i];
  }
  return XP_TIERS[0];
};

interface LeaderboardEntry {
  id: string;
  username: string | null;
  xp: number;
  avatar_url: string | null;
  current_streak: number | null;
  achievements?: string[]; // Added achievements for the toast
}

const PRIMARY_COLOR = "#38e07b";

// --- MAIN COMPONENT ---
export default function LeaderboardScreen() {
  const { darkMode } = useAppContext();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [leaderboardType, setLeaderboardType] = useState<"global" | "my_level">(
    "global"
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<LeaderboardEntry | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  // --- Toast State & Logic ---
  const [toast, setToast] = useState({ visible: false, message: "" });
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    Animated.timing(toastAnim, {
      toValue: 40,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToast({ visible: false, message: "" }));
    }, 3000);
  };

  const handleProfilePress = (profile: LeaderboardEntry) => {
    const achievements = profile.achievements?.join(", ") || "No achievements";
    const streak = profile.current_streak
      ? `${profile.current_streak} days`
      : "N/A";
    const message = `XP: ${profile.xp} | Streak: ${streak} | Achievements: ${achievements}`;
    showToast(message);
  };

  // Fetch the current user and their profile on initial load
  useEffect(() => {
    const initialize = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, xp, avatar_url, current_streak")
          .eq("id", user.id)
          .single();
        setCurrentUserProfile(profile);
      }
    };
    initialize();
  }, []); // Empty dependency array ensures this runs only once

  // Fetch leaderboard data based on search, type, and current user profile.
  // This is debounced to prevent excessive API calls during typing.
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, username, xp, avatar_url, current_streak");

      if (searchQuery) {
        query = query.ilike("username", `%${searchQuery}%`);
      }

      if (leaderboardType === "my_level" && currentUserProfile) {
        const userTier = getTier(currentUserProfile.xp);
        const nextTier = XP_TIERS.find((tier) => tier.xp > userTier.xp) || {
          xp: Infinity,
        };
        query = query.gte("xp", userTier.xp).lt("xp", nextTier.xp);
      }

      const { data, error } = await query
        .order("xp", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Mock achievements for the redesign.
      const dataWithAchievements = data.map((d, index) => ({
        ...d,
        achievements:
          index === 0
            ? ["Brainiac Badge", "Quiz Master"]
            : index === 1
            ? ["Expert", "Streak Master"]
            : null,
      }));

      setLeaderboardData(dataWithAchievements);

      if (currentUser) {
        const rank = data.findIndex((entry) => entry.id === currentUser.id);
        setCurrentUserRank(rank !== -1 ? rank + 1 : null);
      }
    } catch (err: any) {
      showToast("Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, leaderboardType, currentUserProfile, currentUser]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchLeaderboard();
    }, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery, leaderboardType, fetchLeaderboard]);

  const topThree = leaderboardData.slice(0, 3);
  const podiumOrder =
    topThree.length === 3 ? [topThree[1], topThree[0], topThree[2]] : topThree;
  const restOfLeaderboard = leaderboardData.slice(3);

  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number) => (
    <TouchableOpacity
      key={entry.id}
      onPress={() => handleProfilePress(entry)}
      className={`flex-row items-center gap-4 p-3 rounded-lg border ${
        darkMode
          ? "bg-stone-900 border-stone-800"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <Text
        className={`text-xl font-bold w-8 text-center ${
          darkMode ? "text-white" : "text-black"
        }`}
      >
        {index + 1}
      </Text>
      <Image
        source={{ uri: entry.avatar_url || "https://placehold.co/40" }}
        className="h-10 w-10 rounded-full"
      />
      <View className="flex-1">
        <Text
          className={`font-medium ${darkMode ? "text-white" : "text-black"}`}
        >
          {entry.username}
        </Text>
        <Text className="text-sm text-gray-500">{entry.xp} points</Text>
      </View>
    </TouchableOpacity>
  );

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      className={`flex-1 ${darkMode ? "bg-gray-950" : "bg-gray-50"}`}
      style={{
        flex: 1,
        // Critical for Android - prevents content from going under navigation bar
        paddingBottom: Platform.OS === "android" ? insets.bottom : 0,
      }}
    >
      {/* --- Custom Toast Component --- */}
      {toast.visible && (
        <Animated.View
          style={[{ transform: [{ translateY: toastAnim }] }]}
          className="absolute top-0 left-0 right-0 z-20 mx-4"
        >
          <View className="p-4 bg-gray-800 rounded-lg shadow-lg">
            <Text className="text-white text-center font-bold">
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* --- Header --- */}
      <View
        className={`flex-row items-center p-4 border-b ${
          darkMode
            ? "bg-gray-900/50 border-gray-800"
            : "bg-white/50 border-gray-200"
        } backdrop-blur-sm`}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={darkMode ? "white" : "black"}
          />
        </TouchableOpacity>
        <Text
          className={`flex-1 text-center text-xl font-bold pr-10 ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          Leaderboard
        </Text>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* --- Search and Toggle Controls --- */}
          <TextInput
            className={`p-3 rounded-lg mb-4 border ${
              darkMode
                ? "bg-stone-900 border-stone-700 text-white"
                : "bg-gray-100 border-gray-200 text-black"
            }`}
            placeholder="Search username..."
            placeholderTextColor={darkMode ? "#777" : "#999"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View className="flex-row justify-center bg-gray-200 dark:bg-stone-800 p-1 rounded-lg mb-6">
            <TouchableOpacity
              onPress={() => setLeaderboardType("global")}
              className={`flex-1 p-2 rounded-md ${
                leaderboardType === "global" ? `bg-[${PRIMARY_COLOR}]` : ""
              }`}
            >
              <Text
                className={`font-bold text-center ${
                  leaderboardType === "global"
                    ? "text-black"
                    : darkMode
                    ? "text-white"
                    : "text-black"
                }`}
              >
                Global
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLeaderboardType("my_level")}
              className={`flex-1 p-2 rounded-md ${
                leaderboardType === "my_level" ? `bg-[${PRIMARY_COLOR}]` : ""
              }`}
            >
              <Text
                className={`font-bold text-center ${
                  leaderboardType === "my_level"
                    ? "text-black"
                    : darkMode
                    ? "text-white"
                    : "text-black"
                }`}
              >
                My Level
              </Text>
            </TouchableOpacity>
          </View>

          {/* --- My Rank Card (Redesigned) --- */}
          {currentUserProfile && currentUserRank && (
            <View className="rounded-lg bg-gray-800 p-4 mb-6 border border-gray-700">
              <Text className="text-lg font-semibold text-white mb-2">
                Your Rank
              </Text>
              <View className="flex-row items-center gap-4">
                <Text className="text-xl font-bold text-white w-8 text-center">
                  {currentUserRank}
                </Text>
                <Image
                  source={{
                    uri:
                      currentUserProfile.avatar_url ||
                      "https://placehold.co/48",
                  }}
                  className="h-12 w-12 rounded-full"
                />
                <View className="flex-1">
                  <Text className="font-semibold text-white">You</Text>
                  <Text className="text-sm" style={{ color: PRIMARY_COLOR }}>
                    {currentUserProfile.xp} points
                  </Text>
                </View>
                <Ionicons name="trophy-outline" size={32} color="#facc15" />
              </View>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={PRIMARY_COLOR} size="large" />
          ) : (
            <>
              {/* --- Top 3 Podium (Redesigned) --- */}
              {topThree.length > 0 && (
                <View className="mb-6">
                  <Text
                    className={`text-lg font-semibold mb-4 text-center ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    Top 3
                  </Text>
                  <View className="flex-row items-end justify-center gap-2 text-center">
                    {podiumOrder.map((entry, index) => {
                      const isFirst = entry.id === topThree[0].id;
                      const rank =
                        leaderboardData.findIndex((p) => p.id === entry.id) + 1;
                      return (
                        <TouchableOpacity
                          key={entry.id}
                          onPress={() => handleProfilePress(entry)}
                          className="items-center"
                        >
                          <Text
                            className={`font-bold ${
                              isFirst
                                ? "text-yellow-400"
                                : index === 0
                                ? "text-gray-400"
                                : "text-orange-400"
                            }`}
                          >
                            {isFirst ? "1st" : index === 0 ? "2nd" : "3rd"}
                          </Text>
                          <View
                            className="relative mb-2"
                            style={{
                              transform: [{ translateY: isFirst ? 0 : 20 }],
                            }}
                          >
                            <Image
                              source={{
                                uri:
                                  entry.avatar_url || "https://placehold.co/80",
                              }}
                              className={`rounded-full border-4 ${
                                isFirst
                                  ? "w-24 h-24 border-yellow-400"
                                  : index === 0
                                  ? "w-20 h-20 border-gray-500"
                                  : "w-20 h-20 border-orange-400"
                              }`}
                            />
                            <View
                              className={`absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                isFirst
                                  ? "bg-yellow-400"
                                  : index === 0
                                  ? "bg-gray-500"
                                  : "bg-orange-400"
                              }`}
                            >
                              <Text
                                className={
                                  isFirst ? "text-black" : "text-white"
                                }
                              >
                                {rank}
                              </Text>
                            </View>
                          </View>
                          <Text
                            className={`font-semibold ${
                              darkMode ? "text-white" : "text-black"
                            }`}
                          >
                            {entry.username}
                          </Text>
                          <Text className="text-sm text-gray-400">
                            {entry.xp} pts
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              {/* --- Rest of Leaderboard (Updated Style) --- */}
              {restOfLeaderboard.length > 0 && (
                <View className="mt-8">
                  <Text
                    className={`text-lg font-semibold mb-4 ${
                      darkMode ? "text-white" : "text-black"
                    }`}
                  >
                    Ranks 4 - {leaderboardData.length}
                  </Text>
                  <View className="space-y-2">
                    {restOfLeaderboard.map((entry, index) =>
                      renderLeaderboardEntry(entry, index + 3)
                    )}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* --- Footer (Updated Style) --- */}
    </SafeAreaView>
  );
}
