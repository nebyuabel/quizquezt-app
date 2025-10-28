import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAppContext } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabaseClient";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- INTERFACES & CONSTANTS ---
interface Flashcard {
  id: string;
  front_text: string;
  back_text: string;
}
const XP_PER_REMEMBERED = 10;
const XP_PER_BRIEFLY = 5;
const ACCENT_COLOR = "#4ade80"; // Standardized green from the app design
const RED_COLOR = "#ef4444";
const YELLOW_COLOR = "#f59e0b";

// --- HELPER COMPONENTS ---
const AnimatedStatCard = ({
  label,
  icon,
  value,
  color,
  duration = 1500,
  formatter = (v) => v.toFixed(0),
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    animatedValue.addListener(({ value: v }) => {
      setDisplayValue(formatter(v));
    });
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: true,
    }).start();
    return () => animatedValue.removeAllListeners();
  }, [value, formatter]);

  return (
    <View className="bg-stone-800 rounded-lg p-4 items-center w-[30%] space-y-2">
      <Text className="text-stone-400 font-bold text-xs uppercase">
        {label}
      </Text>
      <View className="flex-row items-center space-x-1">
        <Ionicons name={icon} size={24} color={color} />
        <Text style={{ color }} className="text-2xl font-bold">
          {displayValue}
        </Text>
      </View>
    </View>
  );
};

// --- MAIN COMPONENT ---
export default function FlashcardPlayScreen() {
  const params = useLocalSearchParams();
  const { flashcards: flashcardsJson } = params;
  const { darkMode } = useAppContext();

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Session stats for completion screen
  const [sessionStats, setSessionStats] = useState({
    remembered: 0,
    briefly: 0,
    forgot: 0,
  });
  const [timeTaken, setTimeTaken] = useState(0);
  const sessionStart = useRef(Date.now());

  const flipAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const initialize = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated.");
        setUserId(user.id);
        const parsed = flashcardsJson
          ? JSON.parse(flashcardsJson as string)
          : [];
        if (!Array.isArray(parsed) || parsed.length === 0)
          throw new Error("Invalid flashcard data");
        setFlashcards([...parsed].sort(() => Math.random() - 0.5));
        sessionStart.current = Date.now();
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to load session.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    };
    initialize();
  }, [flashcardsJson]);

  const flipCard = useCallback(() => {
    if (isFlipped) return;
    Haptics.selectionAsync();
    Animated.spring(flipAnimation, {
      toValue: 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(true);
  }, [isFlipped]);

  const advanceToNextCard = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= flashcards.length) {
      setTimeTaken(Date.now() - sessionStart.current);
      setSessionCompleted(true);
    } else {
      setIsFlipped(false);
      flipAnimation.setValue(0);
      setCurrentIndex(nextIndex);
    }
    setIsLoading(false);
  }, [currentIndex, flashcards.length]);

  const handleOutcome = useCallback(
    async (quality: 1 | 3 | 5) => {
      if (isLoading) return;
      setIsLoading(true);

      if (quality === 5)
        setSessionStats((s) => ({ ...s, remembered: s.remembered + 1 }));
      else if (quality === 3)
        setSessionStats((s) => ({ ...s, briefly: s.briefly + 1 }));
      else setSessionStats((s) => ({ ...s, forgot: s.forgot + 1 }));

      Haptics.notificationAsync(
        quality > 1
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      // In a real app, you would save progress to Supabase here.
      // For now, we just advance.
      setTimeout(advanceToNextCard, 200);
    },
    [isLoading, advanceToNextCard]
  );

  if (flashcards.length === 0) {
    return (
      <SafeAreaView
        className={`flex-1 justify-center items-center ${
          darkMode ? "bg-stone-950" : "bg-gray-100"
        }`}
      >
        <ActivityIndicator color={ACCENT_COLOR} />
      </SafeAreaView>
    );
  }

  if (sessionCompleted) {
    const totalXP =
      sessionStats.remembered * XP_PER_REMEMBERED +
      sessionStats.briefly * XP_PER_BRIEFLY;
    const accuracy =
      flashcards.length > 0
        ? ((sessionStats.remembered + sessionStats.briefly) /
            flashcards.length) *
          100
        : 0;

    return (
      <SafeAreaView
        className={`flex-1 p-4 justify-between ${
          darkMode ? "bg-stone-950" : "bg-gray-50"
        }`}
      >
        <ConfettiCannon
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
        />
        <View />
        <View className="mb-20">
          <View className="items-center mb-10">
            <Text
              className={`text-5xl font-bold ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              Lesson Complete!
            </Text>
            <Ionicons
              name="sparkles"
              size={40}
              color={YELLOW_COLOR}
              style={{ marginTop: 10 }}
            />
          </View>
          <View className="flex-row justify-around">
            <AnimatedStatCard
              label="TOTAL XP"
              icon="flash"
              value={totalXP}
              color="#facc15"
            />
            <AnimatedStatCard
              label="TIME"
              icon="timer-outline"
              value={timeTaken / 1000}
              color="#38bdf8"
              formatter={(v) =>
                `${Math.floor(v / 60)}:${(v % 60).toFixed(0).padStart(2, "0")}`
              }
            />
            <AnimatedStatCard
              label="ACCURACY"
              icon="checkmark-circle"
              value={accuracy}
              color={ACCENT_COLOR}
              formatter={(v) => `${v.toFixed(0)}%`}
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/flashcards")}
          className="w-full bg-[#4ade80] py-4 rounded-full items-center"
        >
          <Text className="text-white font-bold text-lg">Continue</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const rotateFront = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const rotateBack = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const currentCard = flashcards[currentIndex];
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      className={`flex-1 ${darkMode ? "bg-stone-950" : "bg-gray-100"}`}
      style={{
        flex: 1,
        // Critical for Android - prevents content from going under navigation bar
        paddingBottom: Platform.OS === "android" ? insets.bottom : 0,
      }}
    >
      <View className="flex-row items-center p-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons
            name="arrow-back"
            size={24}
            color={darkMode ? "white" : "black"}
          />
        </TouchableOpacity>
        <View className="flex-1 px-4">
          <View
            className={`h-2.5 rounded-full ${
              darkMode ? "bg-stone-700" : "bg-gray-300"
            }`}
          >
            <View
              className="h-2.5 rounded-full bg-green-500"
              style={{
                width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
              }}
            />
          </View>
        </View>
        <Text
          className={`text-lg font-bold ${
            darkMode ? "text-white" : "text-black"
          }`}
        >
          {currentIndex + 1}/{flashcards.length}
        </Text>
      </View>

      <View className="flex-1 justify-center items-center px-4 pb-8">
        <TouchableOpacity
          activeOpacity={1}
          onPress={flipCard}
          className="w-full h-[90%] max-h-[550px]"
        >
          <Animated.View
            className={`absolute w-full h-full rounded-3xl justify-center items-center p-6 shadow-xl ${
              darkMode ? "bg-stone-800" : "bg-white"
            }`}
            style={[
              {
                transform: [{ rotateY: rotateFront }],
                backfaceVisibility: "hidden",
              },
            ]}
          >
            <Text
              className={`text-3xl font-bold text-center ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              {currentCard.front_text}
            </Text>
          </Animated.View>
          <Animated.View
            className={`absolute w-full h-full rounded-3xl justify-center items-center p-6 shadow-xl ${
              darkMode ? "bg-stone-800" : "bg-white"
            }`}
            style={[
              {
                transform: [{ rotateY: rotateBack }],
                backfaceVisibility: "hidden",
              },
            ]}
          >
            <Text
              className={`text-2xl font-bold text-center ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              {currentCard.back_text}
            </Text>
            {isFlipped && (
              <View
                className={`absolute bottom-0 left-0 right-0 flex-row rounded-b-3xl overflow-hidden border-t ${
                  darkMode ? "border-stone-700" : "border-gray-200"
                }`}
              >
                <Pressable
                  onPress={() => handleOutcome(1)}
                  className="flex-1 items-center justify-center py-4 space-y-1"
                  style={({ pressed }) => [
                    pressed && { backgroundColor: "rgba(239,68,68,0.2)" },
                  ]}
                >
                  <Ionicons name="close" size={24} color={RED_COLOR} />
                  <Text
                    className="text-xs font-bold"
                    style={{ color: RED_COLOR }}
                  >
                    Forgot
                  </Text>
                </Pressable>
                <View
                  className={`w-[1px] h-full ${
                    darkMode ? "bg-stone-700" : "bg-gray-200"
                  }`}
                />
                <Pressable
                  onPress={() => handleOutcome(3)}
                  className="flex-1 items-center justify-center py-4 space-y-1"
                  style={({ pressed }) => [
                    pressed && { backgroundColor: "rgba(245,158,11,0.2)" },
                  ]}
                >
                  <Ionicons name="help" size={24} color={YELLOW_COLOR} />
                  <Text
                    className="text-xs font-bold"
                    style={{ color: YELLOW_COLOR }}
                  >
                    Briefly
                  </Text>
                </Pressable>
                <View
                  className={`w-[1px] h-full ${
                    darkMode ? "bg-stone-700" : "bg-gray-200"
                  }`}
                />
                <Pressable
                  onPress={() => handleOutcome(5)}
                  className="flex-1 items-center justify-center py-4 space-y-1"
                  style={({ pressed }) => [
                    pressed && { backgroundColor: "rgba(56,224,123,0.2)" },
                  ]}
                >
                  <Ionicons name="checkmark" size={24} color={ACCENT_COLOR} />
                  <Text
                    className="text-xs font-bold"
                    style={{ color: ACCENT_COLOR }}
                  >
                    Remembered
                  </Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View className="p-4 items-center">
        <View
          className={`p-4 rounded-lg w-full ${
            darkMode ? "bg-stone-800" : "bg-white"
          }`}
        >
          <Text
            className={`text-center ${
              darkMode ? "text-stone-300" : "text-stone-700"
            }`}
          >
            Tip: Take time to recall the answer before flipping the card for the
            best results.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
