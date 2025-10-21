// app/(tabs)/home.tsx
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  Dimensions,
  FlatList,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Interface definitions
interface UserProfile {
  id: string;
  username: string | null;
  xp: number;
  coins: number;
  avatar_url: string | null;
  quiz_days: string[]; // e.g. ["2025-04-01", "2025-04-02"]
  freeze_days: string[]; // e.g. ["2025-04-03"]
  current_streak: number;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  unit: string;
}

// Constants
const ALL_GRADES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const ALL_SUBJECTS = [
  { name: "Math", icon: "calculator-outline" },
  { name: "Physics", icon: "flash-outline" },
  { name: "Chemistry", icon: "beaker-outline" },
  { name: "Biology", icon: "leaf-outline" },
  { name: "Literature", icon: "book-outline" },
  { name: "SAT", icon: "document-text-outline" },
  { name: "History", icon: "globe-outline" },
  { name: "Geography", icon: "earth-outline" },
  { name: "Economics", icon: "stats-chart-outline" },
];

// Helper: Format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// Helper: Get day of week index (0=Mon, 6=Sun)
const getDayIndex = (date: Date): number => {
  const day = date.getDay(); // 0=Sun, 1=Mon...6=Sat
  return day === 0 ? 6 : day - 1; // Convert to 0=Mon, 6=Sun
};

export default function HomeScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Modal state
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);
  const [modalSelectedGrade, setModalSelectedGrade] = useState<string | null>(
    null
  );
  const [modalSelectedSubject, setModalSelectedSubject] = useState<
    string | null
  >(null);
  const [modalSelectedUnit, setModalSelectedUnit] = useState<string | null>(
    null
  );
  const [modalAvailableUnits, setModalAvailableUnits] = useState<string[]>([]);
  const [isModalLoadingUnits, setIsModalLoadingUnits] =
    useState<boolean>(false);

  // --- Fetch User Profile ---
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoading(true);
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (!currentUser) {
          router.replace("/");
          return;
        }
        setUser(currentUser);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, username, xp, coins, quiz_days, freeze_days, current_streak, avatar_url"
          )
          .eq("id", currentUser.id)
          .single();

        if (profileError) throw profileError;
        setUserProfile(profileData as UserProfile);
      } catch (error: any) {
        console.error("HomeScreen: Error fetching user or profile:", error);
        Alert.alert("Error", `Failed to load data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndProfile();

    const profileChannel = supabase
      .channel("profile_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          console.log("Profile updated via real-time:", payload.new);
          setUserProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  // --- Fetch Units for Modal ---
  useEffect(() => {
    const fetchUnitsForModal = async () => {
      if (!modalSelectedGrade || !modalSelectedSubject) {
        setModalAvailableUnits([]);
        setModalSelectedUnit(null);
        return;
      }
      setIsModalLoadingUnits(true);
      try {
        const { data: unitsData, error } = await supabase
          .from("questions")
          .select("unit", { distinct: true })
          .eq("grade", modalSelectedGrade)
          .eq("subject", modalSelectedSubject)
          .order("unit", { ascending: true });

        if (error) throw error;
        const fetchedUnits = Array.from(
          new Set(unitsData.map((u: { unit: string }) => u.unit?.trim()))
        ).filter(Boolean) as string[];
        setModalAvailableUnits(fetchedUnits);
      } catch (error: any) {
        console.error("Modal: Error fetching units:", error);
        Alert.alert("Error", `Failed to load units: ${error.message}`);
      } finally {
        setIsModalLoadingUnits(false);
      }
    };
    fetchUnitsForModal();
  }, [modalSelectedGrade, modalSelectedSubject]);

  // --- Start Quiz ---
  const handleStartQuiz = async () => {
    if (!modalSelectedGrade || !modalSelectedSubject) return;
    setIsSelectionModalVisible(false);
    setLoading(true);

    try {
      const { data: questionsData, error } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_answer, unit")
        .eq("grade", modalSelectedGrade)
        .eq("subject", modalSelectedSubject);

      if (error) throw error;

      let questionsForUnit = questionsData as Question[];
      if (modalSelectedUnit) {
        questionsForUnit = questionsData.filter(
          (q) => q.unit === modalSelectedUnit
        );
      }

      if (questionsForUnit.length > 0) {
        router.push({
          pathname: "quiz-play",
          params: {
            subject: modalSelectedSubject,
            grade: modalSelectedGrade,
            unit: modalSelectedUnit ?? "All Units",
            quizzes: JSON.stringify(questionsForUnit),
          },
        });
      } else {
        Alert.alert("No Quizzes", "No quizzes found for this selection.");
      }
    } catch (error: any) {
      Alert.alert("Error", `Failed to start quiz: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Render Streak Days (Fixed Logic) ---
  const renderStreakDays = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    const todayFormatted = formatDate(today);
    const todayIndex = getDayIndex(today);

    return days.map((day, index) => {
      const isToday = index === todayIndex;
      const date = new Date(today);
      date.setDate(today.getDate() - todayIndex + index); // Adjust to correct day of week
      const dateStr = formatDate(date);

      const isQuizDay = userProfile?.quiz_days?.includes(dateStr);
      const isFreezeDay = userProfile?.freeze_days?.includes(dateStr);
      const isSkipped = !isQuizDay && !isFreezeDay && index < todayIndex; // Only mark skipped if in past

      let bgColor = "bg-gray-700";
      let icon = null;
      let iconColor = "#1f2937";

      if (isToday) {
        bgColor = "bg-gray-700";
        icon = <Ionicons name="flame" size={24} color="#facc15" />;
      } else if (isQuizDay) {
        bgColor = "bg-[#38e07b]"; // Green
        icon = <Ionicons name="checkmark" size={24} color={iconColor} />;
      } else if (isFreezeDay) {
        bgColor = "bg-blue-500"; // Blue for freeze
        icon = <Ionicons name="snow" size={24} color="white" />;
      } else if (isSkipped) {
        bgColor = "bg-red-500"; // Red for skipped
        icon = <Ionicons name="close" size={24} color="white" />;
      }

      return (
        <View
          key={day}
          className={`flex-col items-center gap-2 ${
            index > todayIndex ? "opacity-50" : ""
          }`}
        >
          <View
            className={`size-10 flex items-center justify-center rounded-full ${bgColor}`}
          >
            {icon}
          </View>
          <Text
            className={`text-xs ${
              isToday ? "text-white font-bold" : "text-gray-400"
            }`}
          >
            {day}
          </Text>
        </View>
      );
    });
  };

  // --- Render Subject Grid (2 columns) - FIXED ALIGNMENT ---
  const renderSubjectItem = ({
    item,
  }: {
    item: { name: string; icon: string };
  }) => (
    <TouchableOpacity
      className="bg-gray-800 p-4 rounded-xl gap-3 m-2 flex-1 min-h-[120px]"
      onPress={() => {
        setModalSelectedSubject(item.name);
        setIsSelectionModalVisible(true);
      }}
    >
      {/* Centered Icon Container */}
      <View className="flex items-center justify-center mb-2">
        <View className="size-12 flex items-center justify-center rounded-lg bg-gray-700">
          <Ionicons name={item.icon as any} size={32} color="#38e07b" />
        </View>
      </View>

      {/* Centered Text */}
      <View className="flex-1 justify-center">
        <Text
          className="text-white text-base font-medium text-center"
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !isSelectionModalVisible) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#38e07b" />
      </SafeAreaView>
    );
  }
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      className="flex-1 bg-gray-900"
      style={{
        flex: 1,
        // Critical for Android - prevents content from going under navigation bar
        paddingBottom: Platform.OS === "android" ? insets.bottom + 60 : 0,
      }}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center p-4">
        <TouchableOpacity
          onPress={() => router.push("profile")}
          className="flex-row items-center gap-2"
        >
          {userProfile?.avatar_url ? (
            <Image
              source={{ uri: userProfile.avatar_url }}
              className="w-10 h-10 rounded-full border-2 border-[#38e07b]"
            />
          ) : (
            <View className="w-10 h-10 rounded-full bg-gray-700 justify-center items-center border-2 border-[#38e07b]">
              <Text className="text-white text-xl">
                {userProfile?.username?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push("store")}
            className="flex items-center justify-center rounded-full h-10 w-10 bg-gray-800"
          >
            <Ionicons name="cart-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("settings")}
            className="flex items-center justify-center rounded-full h-10 w-10 bg-gray-800"
          >
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-3xl font-bold text-white mb-6">
            Hi, {userProfile?.username || "Learner"}!
          </Text>

          {/* Week Streak Card */}
          <View className="p-4 rounded-xl bg-gray-800 mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-400 text-sm font-medium">
                Week Streak
              </Text>
              <View className="flex-row items-center gap-1">
                <Ionicons name="flame" size={20} color="#facc15" />
                <Text className="text-white font-bold">
                  {userProfile?.current_streak ?? 0}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between">
              {renderStreakDays()}
            </View>
          </View>

          {/* XP and Coins Grid */}
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 flex-row items-center gap-4 bg-gray-800 p-4 rounded-xl">
              <View className="flex items-center justify-center rounded-lg bg-gray-700 shrink-0 size-10">
                <Ionicons name="flash" size={24} color="#38e07b" />
              </View>
              <Text className="text-white text-base font-medium flex-1">
                {userProfile?.xp ?? 0} XP
              </Text>
            </View>
            <View className="flex-1 flex-row items-center gap-4 bg-gray-800 p-4 rounded-xl">
              <View className="flex items-center justify-center rounded-lg bg-gray-700 shrink-0 size-10">
                <Ionicons name="server" size={24} color="#facc15" />
              </View>
              <Text className="text-white text-base font-medium flex-1">
                {userProfile?.coins ?? 0} Coins
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="w-full flex items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-[#38e07b] text-gray-900 mb-6"
            onPress={() => setIsSelectionModalVisible(true)}
          >
            <Text className="text-gray-900 text-lg font-bold">
              Start a New Quiz
            </Text>
          </TouchableOpacity>

          {/* Subjects Grid */}
          <Text className="text-xl font-bold text-white mb-4">
            Browse Subjects
          </Text>
          <FlatList
            data={ALL_SUBJECTS}
            renderItem={renderSubjectItem}
            keyExtractor={(item) => item.name}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>

      {/* --- Selection Modal --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSelectionModalVisible}
        onRequestClose={() => setIsSelectionModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-end bg-black/50"
          activeOpacity={1}
          onPress={() => setIsSelectionModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} className="w-full">
            <View
              className="w-full bg-gray-800 rounded-t-2xl p-4"
              style={{ maxHeight: Dimensions.get("window").height * 0.8 }}
            >
              <View className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
              <Text className="text-xl font-bold text-white mb-4 text-center">
                Select Quiz
              </Text>

              {/* Grade */}
              <Text className="text-sm font-medium text-gray-400 mb-2">
                Grade
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                {ALL_GRADES.map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    onPress={() => setModalSelectedGrade(grade)}
                    className={`p-3 rounded-lg mr-2 border ${
                      modalSelectedGrade === grade
                        ? "bg-[#38e07b] border-[#38e07b]"
                        : "bg-gray-700 border-transparent"
                    }`}
                  >
                    <Text
                      className={
                        modalSelectedGrade === grade
                          ? "text-gray-900 font-bold"
                          : "text-white"
                      }
                    >
                      {grade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Subject */}
              <Text className="text-sm font-medium text-gray-400 mb-2">
                Subject
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                {ALL_SUBJECTS.map((subject) => (
                  <TouchableOpacity
                    key={subject.name}
                    onPress={() => setModalSelectedSubject(subject.name)}
                    className={`p-3 rounded-lg mr-2 border flex-row items-center gap-2 ${
                      modalSelectedSubject === subject.name
                        ? "bg-[#38e07b] border-[#38e07b]"
                        : "bg-gray-700 border-transparent"
                    }`}
                  >
                    <Ionicons
                      name={subject.icon as any}
                      size={16}
                      color={
                        modalSelectedSubject === subject.name
                          ? "#1f2937"
                          : "white"
                      }
                    />
                    <Text
                      className={
                        modalSelectedSubject === subject.name
                          ? "text-gray-900 font-bold"
                          : "text-white"
                      }
                    >
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Unit */}
              {modalSelectedGrade && modalSelectedSubject && (
                <>
                  <Text className="text-sm font-medium text-gray-400 mb-2">
                    Unit
                  </Text>
                  {isModalLoadingUnits ? (
                    <ActivityIndicator color="#38e07b" className="my-4" />
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="mb-6"
                    >
                      <TouchableOpacity
                        onPress={() => setModalSelectedUnit(null)}
                        className={`p-3 rounded-lg mr-2 border ${
                          modalSelectedUnit === null
                            ? "bg-[#38e07b] border-[#38e07b]"
                            : "bg-gray-700 border-transparent"
                        }`}
                      >
                        <Text
                          className={
                            modalSelectedUnit === null
                              ? "text-gray-900 font-bold"
                              : "text-white"
                          }
                        >
                          All Units
                        </Text>
                      </TouchableOpacity>
                      {modalAvailableUnits.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          onPress={() => setModalSelectedUnit(unit)}
                          className={`p-3 rounded-lg mr-2 border ${
                            modalSelectedUnit === unit
                              ? "bg-[#38e07b] border-[#38e07b]"
                              : "bg-gray-700 border-transparent"
                          }`}
                        >
                          <Text
                            className={
                              modalSelectedUnit === unit
                                ? "text-gray-900 font-bold"
                                : "text-white"
                            }
                          >
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}

              {/* Start Button */}
              <TouchableOpacity
                onPress={handleStartQuiz}
                disabled={!modalSelectedGrade || !modalSelectedSubject}
                className={`w-full flex items-center justify-center rounded-full h-14 px-5 ${
                  !modalSelectedGrade || !modalSelectedSubject
                    ? "bg-gray-600"
                    : "bg-[#38e07b]"
                }`}
              >
                <Text className="text-gray-900 text-lg font-bold">
                  Start Quiz
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
